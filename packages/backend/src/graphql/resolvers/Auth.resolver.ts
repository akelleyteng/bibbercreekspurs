import { Resolver, Mutation, Query, Arg, Ctx } from 'type-graphql';
import { UserRepository } from '../../repositories/user.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../services/auth.service';
import { User, AuthPayload, RefreshTokenPayload } from '../types/User.type';
import { RegisterInput } from '../inputs/RegisterInput';
import { Context, AuthenticatedContext } from '../context';
import { Role } from '@4hclub/shared';
import { logger } from '../../utils/logger';
import { GraphQLError } from 'graphql';

@Resolver()
export class AuthResolver {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  @Mutation(() => AuthPayload)
  async register(
    @Arg('input') input: RegisterInput,
    @Ctx() { res }: Context
  ): Promise<AuthPayload> {
    try {
      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Create user
      const user = await this.userRepository.create({
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: input.firstName,
        last_name: input.lastName,
        role: Role.MEMBER,
        phone: input.phone,
        address: input.address,
        emergency_contact: input.emergencyContact,
        emergency_phone: input.emergencyPhone,
      });

      // Generate tokens
      const accessToken = generateAccessToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      logger.info(`User registered: ${user.email}`);

      return {
        user: {
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
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        accessToken,
      };
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        throw new GraphQLError('A user with this email already exists', undefined, undefined, undefined, undefined, undefined, {
          extensions: { code: 'EMAIL_ALREADY_EXISTS' },
        });
      }
      logger.error('Registration error:', error);
      throw new GraphQLError('Failed to register user', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'REGISTRATION_FAILED' },
      });
    }
  }

  @Mutation(() => AuthPayload)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res }: Context
  ): Promise<AuthPayload> {
    try {
      // Find user by email
      const userWithPassword = await this.userRepository.findByEmail(email.toLowerCase());

      if (!userWithPassword) {
        throw new GraphQLError('Invalid credentials', undefined, undefined, undefined, undefined, undefined, {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, userWithPassword.password_hash);

      if (!isValidPassword) {
        throw new GraphQLError('Invalid credentials', undefined, undefined, undefined, undefined, undefined, {
          extensions: { code: 'INVALID_CREDENTIALS' },
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(userWithPassword.id, userWithPassword.email);
      const refreshToken = generateRefreshToken(userWithPassword.id);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      logger.info(`User logged in: ${userWithPassword.email}`);

      // Remove password_hash before returning
      const { password_hash, ...user } = userWithPassword;

      return {
        user: {
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
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new GraphQLError('Failed to login', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'LOGIN_FAILED' },
      });
    }
  }

  @Query(() => User)
  async me(@Ctx() context: Context): Promise<User> {
    // Extract token from Authorization header
    const authHeader = context.req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify access token
      const payload = verifyAccessToken(token);

      // Fetch user from database
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new GraphQLError('User not found', undefined, undefined, undefined, undefined, undefined, {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

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
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Me query error:', error);
      throw new GraphQLError('Invalid token', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'INVALID_TOKEN' },
      });
    }
  }

  @Mutation(() => RefreshTokenPayload)
  async refreshToken(@Ctx() { req }: Context): Promise<RefreshTokenPayload> {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new GraphQLError('No refresh token provided', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'NO_REFRESH_TOKEN' },
      });
    }

    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Fetch user to ensure they still exist
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new GraphQLError('User not found', undefined, undefined, undefined, undefined, undefined, {
          extensions: { code: 'USER_NOT_FOUND' },
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user.id, user.email);

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        accessToken,
      };
    } catch (error: any) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error('Refresh token error:', error);
      throw new GraphQLError('Invalid refresh token', undefined, undefined, undefined, undefined, undefined, {
        extensions: { code: 'INVALID_REFRESH_TOKEN' },
      });
    }
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: Context): Promise<boolean> {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    logger.info('User logged out');

    return true;
  }
}
