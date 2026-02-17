import { Resolver, Query, Ctx } from 'type-graphql';
import { User } from '../types/User.type';
import { YouthMember } from '../types/YouthMember.type';
import { UserRepository } from '../../repositories/user.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import { verifyAccessToken } from '../../services/auth.service';
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

  @Query(() => [User])
  async users(@Ctx() context: Context): Promise<User[]> {
    // Require authentication to view member directory
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

      // Fetch youth members for all users
      const users: User[] = [];
      for (const u of dbUsers) {
        const youthRows = await this.youthMemberRepo.findByParentId(u.id);
        users.push({
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
          youthMembers: youthRows.length > 0 ? youthRows.map(ym => this.mapYouthMember(ym)) : undefined,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        });
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
}
