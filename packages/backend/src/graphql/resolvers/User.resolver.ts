import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { User } from '../types/User.type';
import { YouthMember } from '../types/YouthMember.type';
import { UserRepository } from '../../repositories/user.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import { verifyAccessToken, hashPassword } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class UserResolver {
  private userRepo: UserRepository;
  private youthMemberRepo: YouthMemberRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.youthMemberRepo = new YouthMemberRepository();
  }

  private mapYouthMember(row: any): YouthMember {
    return {
      id: row.id,
      parentUserId: row.parent_user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      birthdate: row.birthdate,
      project: row.project,
      horseNames: row.horse_names,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUser(u: any, youthMembers?: YouthMember[]): User {
    return {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      phone: u.phone,
      address: u.address,
      emergencyContact: u.emergency_contact,
      emergencyPhone: u.emergency_phone,
      profilePhotoUrl: u.profile_photo_url,
      passwordResetRequired: u.password_reset_required || false,
      youthMembers,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  }

  private async requireAdmin(context: Context): Promise<void> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);
    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
  }

  @Query(() => [User])
  async users(@Ctx() context: Context): Promise<User[]> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      const token = authHeader.substring(7);
      verifyAccessToken(token);

      const dbUsers = await this.userRepo.findAll();

      const users: User[] = [];
      for (const u of dbUsers) {
        const youthRows = await this.youthMemberRepo.findByParentId(u.id);
        users.push(this.mapUser(u, youthRows.length > 0 ? youthRows.map(ym => this.mapYouthMember(ym)) : undefined));
      }

      return users;
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      logger.error('Users query error:', error);
      throw new GraphQLError('Failed to fetch users', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  @Query(() => [YouthMember])
  async allYouthMembers(@Ctx() context: Context): Promise<YouthMember[]> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    try {
      const token = authHeader.substring(7);
      verifyAccessToken(token);

      const rows = await this.youthMemberRepo.findAll();
      return rows.map(ym => this.mapYouthMember(ym));
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      logger.error('AllYouthMembers query error:', error);
      throw new GraphQLError('Failed to fetch youth members', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  @Mutation(() => User)
  async adminCreateUser(
    @Arg('firstName') firstName: string,
    @Arg('lastName') lastName: string,
    @Arg('email') email: string,
    @Arg('role', { nullable: true }) role: string,
    @Arg('phone', { nullable: true }) phone: string,
    @Arg('address', { nullable: true }) address: string,
    @Arg('emergencyContact', { nullable: true }) emergencyContact: string,
    @Arg('emergencyPhone', { nullable: true }) emergencyPhone: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const tempPassword = 'Welcome2025!';
    const passwordHash = await hashPassword(tempPassword);

    try {
      const created = await this.userRepo.create({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: (role as Role) || Role.PARENT,
        phone: phone || undefined,
        address: address || undefined,
        emergency_contact: emergencyContact || undefined,
        emergency_phone: emergencyPhone || undefined,
        password_reset_required: true,
      });

      return this.mapUser(created);
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        throw new GraphQLError('A user with this email already exists', { extensions: { code: 'BAD_INPUT' } });
      }
      logger.error('adminCreateUser error:', error);
      throw new GraphQLError('Failed to create user', { extensions: { code: 'INTERNAL_ERROR' } });
    }
  }

  @Mutation(() => User)
  async adminUpdateUser(
    @Arg('id') id: string,
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('role', { nullable: true }) role: string,
    @Arg('phone', { nullable: true }) phone: string,
    @Arg('address', { nullable: true }) address: string,
    @Arg('emergencyContact', { nullable: true }) emergencyContact: string,
    @Arg('emergencyPhone', { nullable: true }) emergencyPhone: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const updateData: any = {};
    if (firstName !== undefined && firstName !== null) updateData.first_name = firstName;
    if (lastName !== undefined && lastName !== null) updateData.last_name = lastName;
    if (email !== undefined && email !== null) updateData.email = email.toLowerCase();
    if (role !== undefined && role !== null) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (emergencyContact !== undefined) updateData.emergency_contact = emergencyContact || null;
    if (emergencyPhone !== undefined) updateData.emergency_phone = emergencyPhone || null;

    try {
      const updated = await this.userRepo.adminUpdate(id, updateData);
      if (!updated) {
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const youthRows = await this.youthMemberRepo.findByParentId(id);
      return this.mapUser(updated, youthRows.length > 0 ? youthRows.map(ym => this.mapYouthMember(ym)) : undefined);
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      if (error.message === 'Email already exists') {
        throw new GraphQLError('Email already exists', { extensions: { code: 'BAD_INPUT' } });
      }
      logger.error('adminUpdateUser error:', error);
      throw new GraphQLError('Failed to update user', { extensions: { code: 'INTERNAL_ERROR' } });
    }
  }

  @Mutation(() => Boolean)
  async adminDeleteUser(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);
    return this.userRepo.delete(id);
  }

  @Mutation(() => YouthMember)
  async adminCreateYouthMember(
    @Arg('parentUserId') parentUserId: string,
    @Arg('firstName') firstName: string,
    @Arg('lastName') lastName: string,
    @Arg('birthdate', { nullable: true }) birthdate: string,
    @Arg('project', { nullable: true }) project: string,
    @Arg('horseNames', { nullable: true }) horseNames: string,
    @Ctx() context: Context
  ): Promise<YouthMember> {
    await this.requireAdmin(context);

    const row = await this.youthMemberRepo.create({
      parent_user_id: parentUserId,
      first_name: firstName,
      last_name: lastName,
      birthdate: birthdate || undefined,
      project: project || undefined,
      horse_names: horseNames || undefined,
    });
    return this.mapYouthMember(row);
  }

  @Mutation(() => YouthMember)
  async adminUpdateYouthMember(
    @Arg('id') id: string,
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('birthdate', { nullable: true }) birthdate: string,
    @Arg('project', { nullable: true }) project: string,
    @Arg('horseNames', { nullable: true }) horseNames: string,
    @Ctx() context: Context
  ): Promise<YouthMember> {
    await this.requireAdmin(context);

    const updateData: any = {};
    if (firstName !== undefined && firstName !== null) updateData.first_name = firstName;
    if (lastName !== undefined && lastName !== null) updateData.last_name = lastName;
    if (birthdate !== undefined) updateData.birthdate = birthdate || null;
    if (project !== undefined) updateData.project = project || null;
    if (horseNames !== undefined) updateData.horse_names = horseNames || null;

    const updated = await this.youthMemberRepo.update(id, updateData);
    if (!updated) {
      throw new GraphQLError('Youth member not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return this.mapYouthMember(updated);
  }

  @Mutation(() => Boolean)
  async adminDeleteYouthMember(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);
    return this.youthMemberRepo.delete(id);
  }
}
