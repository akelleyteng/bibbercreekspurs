import { Resolver, Mutation, Query, Arg, Ctx } from 'type-graphql';
import { UserRepository } from '../../repositories/user.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../services/auth.service';
import { emailService } from '../../services/email.service';
import { User, AuthPayload, RefreshTokenPayload, RegisterPayload } from '../types/User.type';
import { RegisterInput } from '../inputs/RegisterInput';
import { Context } from '../context';
import { Role, ROLE_LABELS } from '@4hclub/shared';
import { logger } from '../../utils/logger';
import { GraphQLError } from 'graphql';
import { User as DbUser } from '../../repositories/user.repository';

function parseUserAgent(ua: string): string {
  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = 'Unknown';
  if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}

function mapDbUserToGql(user: DbUser): User {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    phone: user.phone,
    address: user.address,
    emergencyContact: user.emergency_contact,
    emergencyPhone: user.emergency_phone,
    profilePhotoUrl: user.profile_photo_url,
    passwordResetRequired: user.password_reset_required || false,
    horseName: user.horse_name,
    project: user.project,
    birthday: user.birthday,
    tshirtSize: user.tshirt_size,
    approvalStatus: user.approval_status,
    postCount: 0,
    commentCount: 0,
    blogPostCount: 0,
    linkedChildren: [],
    linkedParents: [],
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

@Resolver()
export class AuthResolver {
  private userRepository: UserRepository;
  private youthMemberRepo: YouthMemberRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.youthMemberRepo = new YouthMemberRepository();
  }

  @Mutation(() => RegisterPayload)
  async register(
    @Arg('input') input: RegisterInput,
  ): Promise<RegisterPayload> {
    try {
      // Validate role - only PARENT or YOUTH_MEMBER allowed for self-registration
      if (input.role !== Role.PARENT && input.role !== Role.YOUTH_MEMBER) {
        throw new GraphQLError('Only Parent or Youth Member roles are allowed for self-registration', {
          extensions: { code: 'BAD_INPUT' },
        });
      }

      const passwordHash = await hashPassword(input.password);

      const user = await this.userRepository.create({
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: input.firstName,
        last_name: input.lastName,
        role: input.role,
        phone: input.phone,
        address: input.address,
        emergency_contact: input.emergencyContact,
        emergency_phone: input.emergencyPhone,
        approval_status: 'PENDING',
      });

      // If parent and youth member info provided, handle youth member linking
      if (input.role === Role.PARENT && input.youthFirstName && input.youthLastName) {
        const existingYouth = await this.youthMemberRepo.findByName(
          input.youthFirstName, input.youthLastName
        );
        if (existingYouth) {
          await this.youthMemberRepo.linkToUser(existingYouth.id, user.id);
        } else {
          await this.youthMemberRepo.create({
            parent_user_id: user.id,
            first_name: input.youthFirstName,
            last_name: input.youthLastName,
          });
        }
      }

      logger.info(`User registered (pending approval): ${user.email}`);

      // Notify admins (fire-and-forget)
      const admins = await this.userRepository.findAdmins();
      const memberName = `${user.first_name} ${user.last_name}`;
      const roleLabel = ROLE_LABELS[user.role] || user.role;
      for (const admin of admins) {
        emailService.notifyAdminNewRegistration(
          admin.email, memberName, user.email, roleLabel, user.id
        );
      }

      return {
        success: true,
        message: 'Thanks for creating your account! The site admin will review your submission soon!',
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      if (error.message === 'Email already exists') {
        throw new GraphQLError('A user with this email already exists', {
          extensions: { code: 'EMAIL_ALREADY_EXISTS' },
        });
      }
      logger.error('Registration error:', error);
      throw new GraphQLError('Failed to register user', {
        extensions: { code: 'REGISTRATION_FAILED' },
      });
    }
  }

  @Mutation(() => AuthPayload)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Arg('rememberMe', { nullable: true, defaultValue: false }) rememberMe: boolean,
    @Ctx() { req, res }: Context
  ): Promise<AuthPayload> {
    try {
      const userWithPassword = await this.userRepository.findByEmail(email.toLowerCase());

      if (!userWithPassword) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      // Check approval status before password verification
      if (userWithPassword.approval_status === 'PENDING') {
        throw new GraphQLError('Your account is pending approval. Please wait for an admin to review your registration.', {
          extensions: { code: 'ACCOUNT_PENDING' },
        });
      }
      if (userWithPassword.approval_status === 'DECLINED') {
        throw new GraphQLError('Your account registration was declined. Please contact the club leadership.', {
          extensions: { code: 'ACCOUNT_DECLINED' },
        });
      }

      const isValidPassword = await comparePassword(password, userWithPassword.password_hash);

      if (!isValidPassword) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      const accessToken = generateAccessToken(userWithPassword.id, userWithPassword.email);
      const refreshToken = generateRefreshToken(userWithPassword.id, rememberMe);

      const cookieMaxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: cookieMaxAge,
        path: '/',
      });

      logger.info(`User logged in: ${userWithPassword.email}`);

      const userAgent = req.headers['user-agent'] || '';
      const device = userAgent ? parseUserAgent(userAgent) : null;
      this.userRepository.updateLastLogin(userWithPassword.id, device);

      const { password_hash, ...user } = userWithPassword;

      return {
        user: mapDbUserToGql(user as any),
        accessToken,
        refreshToken: rememberMe ? refreshToken : undefined,
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new GraphQLError('Failed to login', {
        extensions: { code: 'LOGIN_FAILED' },
      });
    }
  }

  @Query(() => User)
  async me(@Ctx() context: Context): Promise<User> {
    const authHeader = context.req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      if (user.approval_status !== 'APPROVED') {
        throw new GraphQLError('Your account is not approved', {
          extensions: { code: 'ACCOUNT_NOT_APPROVED' },
        });
      }

      return mapDbUserToGql(user);
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Me query error:', error);
      throw new GraphQLError('Invalid token', {
        extensions: { code: 'INVALID_TOKEN' },
      });
    }
  }

  @Mutation(() => RefreshTokenPayload)
  async refreshToken(
    @Arg('token', { nullable: true }) token: string,
    @Ctx() { req }: Context
  ): Promise<RefreshTokenPayload> {
    const refreshToken = token || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new GraphQLError('No refresh token provided', {
        extensions: { code: 'NO_REFRESH_TOKEN' },
      });
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      if (user.approval_status !== 'APPROVED') {
        throw new GraphQLError('Your account is not approved', {
          extensions: { code: 'ACCOUNT_NOT_APPROVED' },
        });
      }

      const accessToken = generateAccessToken(user.id, user.email);

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        accessToken,
        user: mapDbUserToGql(user),
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Refresh token error:', error);
      throw new GraphQLError('Invalid refresh token', {
        extensions: { code: 'INVALID_REFRESH_TOKEN' },
      });
    }
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: Context): Promise<boolean> {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    logger.info('User logged out');

    return true;
  }

  @Mutation(() => Boolean)
  async changePassword(
    @Arg('currentPassword') currentPassword: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const authHeader = context.req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);

      if (!payload.email) {
        throw new GraphQLError('Invalid token: missing email', {
          extensions: { code: 'INVALID_TOKEN' },
        });
      }

      const user = await this.userRepository.findByEmail(payload.email);

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      const isValidPassword = await comparePassword(currentPassword, user.password_hash);

      if (!isValidPassword) {
        throw new GraphQLError('Current password is incorrect', {
          extensions: { code: 'INVALID_PASSWORD' },
        });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await this.userRepository.updatePassword(user.id, newPasswordHash);

      logger.info(`Password changed for user: ${user.email}`);

      return true;
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Change password error:', error);
      throw new GraphQLError('Failed to change password', {
        extensions: { code: 'PASSWORD_CHANGE_FAILED' },
      });
    }
  }
}
