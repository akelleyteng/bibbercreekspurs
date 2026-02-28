import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { User, UserAvatarInfo } from '../types/User.type';
import { YouthMember } from '../types/YouthMember.type';
import { UserRepository } from '../../repositories/user.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import { FamilyLinkRepository, LinkedUser } from '../../repositories/family-link.repository';
import { verifyAccessToken, hashPassword } from '../../services/auth.service';
import { emailService } from '../../services/email.service';
import { NotificationRepository } from '../../repositories/notification.repository';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class UserResolver {
  private userRepo: UserRepository;
  private youthMemberRepo: YouthMemberRepository;
  private familyLinkRepo: FamilyLinkRepository;
  private notifRepo: NotificationRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.youthMemberRepo = new YouthMemberRepository();
    this.familyLinkRepo = new FamilyLinkRepository();
    this.notifRepo = new NotificationRepository();
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
      horseExperience: row.horse_experience,
      userId: row.user_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapLinkedUsers(users: LinkedUser[]) {
    return users.map(u => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      role: u.role,
      profilePhotoUrl: u.profile_photo_url,
    }));
  }

  private mapUser(
    u: any,
    youthMembers?: YouthMember[],
    activityCounts?: { post_count: number; comment_count: number; blog_post_count: number },
    familyLinks?: { parents: LinkedUser[]; children: LinkedUser[] },
  ): User {
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
      horsePhotoUrl: u.horse_photo_url,
      avatarChoice: u.avatar_choice || 'initials',
      passwordResetRequired: u.password_reset_required || false,
      horseName: u.horse_name,
      horseExperience: u.horse_experience,
      project: u.project,
      birthday: u.birthday,
      tshirtSize: u.tshirt_size,
      approvalStatus: u.approval_status,
      isActive: u.is_active !== false,
      lastLogin: u.last_login || undefined,
      lastLoginDevice: u.last_login_device || undefined,
      postCount: activityCounts?.post_count ?? 0,
      commentCount: activityCounts?.comment_count ?? 0,
      blogPostCount: activityCounts?.blog_post_count ?? 0,
      youthMembers,
      linkedChildren: familyLinks?.children ? this.mapLinkedUsers(familyLinks.children) : [],
      linkedParents: familyLinks?.parents ? this.mapLinkedUsers(familyLinks.parents) : [],
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

  private getAuthUserId(context: Context): string {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
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
      const activityMap = await this.userRepo.getAllActivityCounts();
      const familyLinksMap = await this.familyLinkRepo.findAllGrouped();

      // Member directory only shows approved and active members
      const visibleUsers = dbUsers.filter(u => u.approval_status === 'APPROVED' && u.is_active !== false);

      const users: User[] = [];
      for (const u of visibleUsers) {
        const youthRows = await this.youthMemberRepo.findByParentId(u.id);
        const counts = activityMap.get(u.id);
        const links = familyLinksMap.get(u.id);
        users.push(this.mapUser(u, youthRows.length > 0 ? youthRows.map(ym => this.mapYouthMember(ym)) : undefined, counts, links));
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

  @Query(() => UserAvatarInfo, { nullable: true })
  async userAvatar(
    @Arg('userId', () => String) userId: string,
    @Ctx() context: Context
  ): Promise<UserAvatarInfo | null> {
    // Require authentication
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    verifyAccessToken(token);

    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    return {
      profilePhotoUrl: user.profile_photo_url || undefined,
      horsePhotoUrl: user.horse_photo_url || undefined,
      avatarChoice: user.avatar_choice || 'initials',
    };
  }

  @Query(() => [User])
  async pendingUsers(@Ctx() context: Context): Promise<User[]> {
    await this.requireAdmin(context);

    try {
      const pending = await this.userRepo.findPending();
      const users: User[] = [];
      for (const u of pending) {
        const youthRows = await this.youthMemberRepo.findByParentId(u.id);
        users.push(this.mapUser(u, youthRows.length > 0 ? youthRows.map(ym => this.mapYouthMember(ym)) : undefined));
      }
      return users;
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      logger.error('pendingUsers query error:', error);
      throw new GraphQLError('Failed to fetch pending users', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  @Mutation(() => User)
  async adminApproveUser(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const updated = await this.userRepo.adminUpdate(id, { approval_status: 'APPROVED' });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Send approval email (fire-and-forget)
    emailService.notifyMemberApproved(
      updated.email,
      `${updated.first_name} ${updated.last_name}`,
      updated.id
    );

    // Notify ADMIN and ADULT_LEADER users about new member (fire-and-forget)
    const memberName = `${updated.first_name} ${updated.last_name}`;
    this.userRepo.findAll().then(allUsers => {
      const leaderIds = allUsers
        .filter(u => (u.role === Role.ADMIN || u.role === Role.ADULT_LEADER)
          && u.approval_status === 'APPROVED' && u.is_active !== false)
        .map(u => u.id);
      if (leaderIds.length > 0) {
        this.notifRepo.createForMultipleUsers(leaderIds, {
          type: 'NEW_MEMBER',
          actor_id: id,
          related_user_id: id,
          title: `New member joined: ${memberName}`,
        }).catch(err => logger.warn('Failed to create new member notifications', { error: err?.message }));
      }
    }).catch(err => logger.warn('Failed to fetch users for member notifications', { error: err?.message }));

    return this.mapUser(updated);
  }

  @Mutation(() => User)
  async adminDeclineUser(
    @Arg('id') id: string,
    @Arg('reason', { nullable: true }) reason: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const updated = await this.userRepo.adminUpdate(id, { approval_status: 'DECLINED' });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    // Send decline email (fire-and-forget)
    emailService.notifyMemberDeclined(
      updated.email,
      `${updated.first_name} ${updated.last_name}`,
      updated.id,
      reason
    );

    return this.mapUser(updated);
  }

  @Mutation(() => User)
  async updateMyProfile(
    @Arg('phone', { nullable: true }) phone: string,
    @Arg('address', { nullable: true }) address: string,
    @Arg('emergencyContact', { nullable: true }) emergencyContact: string,
    @Arg('emergencyPhone', { nullable: true }) emergencyPhone: string,
    @Arg('horseName', { nullable: true }) horseName: string,
    @Arg('horseExperience', { nullable: true }) horseExperience: string,
    @Arg('project', { nullable: true }) project: string,
    @Arg('birthday', { nullable: true }) birthday: string,
    @Arg('tshirtSize', { nullable: true }) tshirtSize: string,
    @Arg('avatarChoice', { nullable: true }) avatarChoice: string,
    @Ctx() context: Context
  ): Promise<User> {
    const userId = this.getAuthUserId(context);

    const updateData: any = {};
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (emergencyContact !== undefined) updateData.emergency_contact = emergencyContact || null;
    if (emergencyPhone !== undefined) updateData.emergency_phone = emergencyPhone || null;
    if (horseName !== undefined) updateData.horse_name = horseName || null;
    if (horseExperience !== undefined) updateData.horse_experience = horseExperience || null;
    if (project !== undefined) updateData.project = project || null;
    if (birthday !== undefined) updateData.birthday = birthday || null;
    if (tshirtSize !== undefined) updateData.tshirt_size = tshirtSize || null;
    if (avatarChoice !== undefined) updateData.avatar_choice = avatarChoice || 'initials';

    const updated = await this.userRepo.update(userId, updateData);
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return this.mapUser(updated);
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
        // Admin-created users are auto-approved (DB default is 'APPROVED')
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
    @Arg('horseName', { nullable: true }) horseName: string,
    @Arg('horseExperience', { nullable: true }) horseExperience: string,
    @Arg('project', { nullable: true }) project: string,
    @Arg('birthday', { nullable: true }) birthday: string,
    @Arg('tshirtSize', { nullable: true }) tshirtSize: string,
    @Arg('avatarChoice', { nullable: true }) avatarChoice: string,
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
    if (horseName !== undefined) updateData.horse_name = horseName || null;
    if (horseExperience !== undefined) updateData.horse_experience = horseExperience || null;
    if (project !== undefined) updateData.project = project || null;
    if (birthday !== undefined) updateData.birthday = birthday || null;
    if (tshirtSize !== undefined) updateData.tshirt_size = tshirtSize || null;
    if (avatarChoice !== undefined) updateData.avatar_choice = avatarChoice || 'initials';

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
        throw new GraphQLError('A user with this email already exists', { extensions: { code: 'BAD_INPUT' } });
      }
      logger.error('adminUpdateUser error:', error);
      // Surface the actual error message for debugging instead of generic message
      const message = error.code === '23505' ? 'A unique constraint was violated'
        : error.code === '23503' ? 'A referenced record was not found'
        : `Failed to update user: ${error.message || 'Unknown error'}`;
      throw new GraphQLError(message, { extensions: { code: 'INTERNAL_ERROR' } });
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

  @Mutation(() => User)
  async adminDisableUser(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const updated = await this.userRepo.adminUpdate(id, { is_active: false });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return this.mapUser(updated);
  }

  @Mutation(() => User)
  async adminEnableUser(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<User> {
    await this.requireAdmin(context);

    const updated = await this.userRepo.adminUpdate(id, { is_active: true });
    if (!updated) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    return this.mapUser(updated);
  }

  @Query(() => [User])
  async adminDisabledUsers(@Ctx() context: Context): Promise<User[]> {
    await this.requireAdmin(context);

    try {
      const disabled = await this.userRepo.findDisabled();
      return disabled.map(u => this.mapUser(u));
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      logger.error('adminDisabledUsers query error:', error);
      throw new GraphQLError('Failed to fetch disabled users', {
        extensions: { code: 'INTERNAL_ERROR' },
      });
    }
  }

  @Mutation(() => Boolean)
  async adminResetPassword(
    @Arg('id') id: string,
    @Arg('newPassword') newPassword: string,
    @Arg('forceResetOnLogin') forceResetOnLogin: boolean,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    }

    const passwordHash = await hashPassword(newPassword);
    return this.userRepo.updatePassword(id, passwordHash, forceResetOnLogin);
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
