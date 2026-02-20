import { Resolver, Mutation, Query, Arg, Ctx } from 'type-graphql';
import { FamilyLink } from '../types/FamilyLink.type';
import { FamilyLinkRepository } from '../../repositories/family-link.repository';
import { YouthMemberRepository } from '../../repositories/youth-member.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class FamilyLinkResolver {
  private familyLinkRepo: FamilyLinkRepository;
  private youthMemberRepo: YouthMemberRepository;
  private userRepo: UserRepository;

  constructor() {
    this.familyLinkRepo = new FamilyLinkRepository();
    this.youthMemberRepo = new YouthMemberRepository();
    this.userRepo = new UserRepository();
  }

  private async getAuthUser(context: Context) {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const payload = verifyAccessToken(authHeader.substring(7));
    const user = await this.userRepo.findById(payload.userId);
    if (!user) {
      throw new GraphQLError('User not found', { extensions: { code: 'USER_NOT_FOUND' } });
    }
    return user;
  }

  @Mutation(() => FamilyLink)
  async addFamilyLink(
    @Arg('parentUserId') parentUserId: string,
    @Arg('childUserId') childUserId: string,
    @Ctx() context: Context
  ): Promise<FamilyLink> {
    const authUser = await this.getAuthUser(context);

    // Admin can link anyone; parents can only link themselves
    if (authUser.role !== Role.ADMIN && authUser.id !== parentUserId) {
      throw new GraphQLError('You can only link your own account', { extensions: { code: 'FORBIDDEN' } });
    }

    if (parentUserId === childUserId) {
      throw new GraphQLError('Cannot link a user to themselves', { extensions: { code: 'BAD_INPUT' } });
    }

    const link = await this.familyLinkRepo.create(parentUserId, childUserId);
    return {
      id: link.id,
      parentUserId: link.parent_user_id,
      childUserId: link.child_user_id,
      createdAt: link.created_at,
    };
  }

  @Mutation(() => Boolean)
  async removeFamilyLink(
    @Arg('parentUserId') parentUserId: string,
    @Arg('childUserId') childUserId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const authUser = await this.getAuthUser(context);

    // Admin can unlink anyone; parents can only unlink themselves
    if (authUser.role !== Role.ADMIN && authUser.id !== parentUserId) {
      throw new GraphQLError('You can only unlink your own account', { extensions: { code: 'FORBIDDEN' } });
    }

    return this.familyLinkRepo.delete(parentUserId, childUserId);
  }

  @Mutation(() => Boolean)
  async linkYouthMemberToUser(
    @Arg('youthMemberId') youthMemberId: string,
    @Arg('userId') userId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const authUser = await this.getAuthUser(context);

    // Only admin can link youth member records to accounts
    if (authUser.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }

    return this.youthMemberRepo.linkToUser(youthMemberId, userId);
  }

  @Mutation(() => Boolean)
  async unlinkYouthMemberFromUser(
    @Arg('youthMemberId') youthMemberId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    const authUser = await this.getAuthUser(context);

    if (authUser.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }

    return this.youthMemberRepo.unlinkUser(youthMemberId);
  }
}
