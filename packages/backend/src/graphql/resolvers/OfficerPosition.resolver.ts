import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { OfficerPositionType } from '../types/OfficerPosition.type';
import { OfficerPositionRepository, OfficerPositionRow } from '../../repositories/officer-position.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role, OfficerPosition, OFFICER_POSITION_LABELS, OFFICER_POSITION_DESCRIPTIONS } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class OfficerPositionResolver {
  private officerRepo: OfficerPositionRepository;
  private userRepo: UserRepository;

  constructor() {
    this.officerRepo = new OfficerPositionRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: OfficerPositionRow): OfficerPositionType {
    const position = row.position as OfficerPosition;
    const result: OfficerPositionType = {
      id: row.id,
      position: row.position,
      termYear: row.term_year,
      holderUserId: row.holder_user_id || undefined,
      holderYouthMemberId: row.holder_youth_member_id || undefined,
      label: OFFICER_POSITION_LABELS[position] || row.position,
      description: OFFICER_POSITION_DESCRIPTIONS[position] || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.holder_user_id && row.user_first_name) {
      result.holder = {
        firstName: row.user_first_name,
        lastName: row.user_last_name!,
        email: row.user_email,
        profilePhotoUrl: row.user_profile_photo_url,
        holderType: 'user',
      };
    } else if (row.holder_youth_member_id && row.youth_first_name) {
      result.holder = {
        firstName: row.youth_first_name,
        lastName: row.youth_last_name!,
        holderType: 'youth',
      };
    }

    return result;
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

  @Query(() => [OfficerPositionType])
  async officerPositions(
    @Arg('termYear') termYear: string
  ): Promise<OfficerPositionType[]> {
    const rows = await this.officerRepo.findByYear(termYear);
    return rows.map(r => this.mapRow(r));
  }

  @Query(() => [String])
  async officerTermYears(): Promise<string[]> {
    return this.officerRepo.getTermYears();
  }

  @Mutation(() => OfficerPositionType)
  async setOfficer(
    @Arg('position') position: string,
    @Arg('termYear') termYear: string,
    @Arg('holderUserId', { nullable: true }) holderUserId: string,
    @Arg('holderYouthMemberId', { nullable: true }) holderYouthMemberId: string,
    @Ctx() context: Context
  ): Promise<OfficerPositionType> {
    await this.requireAdmin(context);

    if (!holderUserId && !holderYouthMemberId) {
      throw new GraphQLError('Must provide either holderUserId or holderYouthMemberId', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const row = await this.officerRepo.upsert(
      position,
      termYear,
      holderUserId || null,
      holderYouthMemberId || null
    );

    // Re-fetch with joins to get holder names
    const rows = await this.officerRepo.findByYear(termYear);
    const updated = rows.find(r => r.position === position);
    return this.mapRow(updated || row);
  }

  @Mutation(() => Boolean)
  async removeOfficer(
    @Arg('position') position: string,
    @Arg('termYear') termYear: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);
    return this.officerRepo.remove(position, termYear);
  }
}
