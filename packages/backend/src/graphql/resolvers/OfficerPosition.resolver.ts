import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import { OfficerPositionType, OfficerRoleType } from '../types/OfficerPosition.type';
import { OfficerPositionRepository, OfficerPositionRow, OfficerRoleRow } from '../../repositories/officer-position.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
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

  private async mapRow(row: OfficerPositionRow): Promise<OfficerPositionType> {
    // Look up label/description from the officer_roles table
    const roles = await this.officerRepo.findAllRoles();
    const role = roles.find(r => r.name === row.position);

    const result: OfficerPositionType = {
      id: row.id,
      position: row.position,
      termYear: row.term_year,
      holderUserId: row.holder_user_id || undefined,
      holderYouthMemberId: row.holder_youth_member_id || undefined,
      label: role?.label || row.position,
      description: role?.description || '',
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

  // --- Role definition queries/mutations ---

  @Query(() => [OfficerRoleType])
  async officerRoles(): Promise<OfficerRoleType[]> {
    const rows = await this.officerRepo.findAllRoles();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description,
      sortOrder: r.sort_order,
    }));
  }

  @Mutation(() => OfficerRoleType)
  async createOfficerRole(
    @Arg('name') name: string,
    @Arg('label') label: string,
    @Arg('description', { defaultValue: '' }) description: string,
    @Arg('sortOrder', () => Int, { defaultValue: 99 }) sortOrder: number,
    @Ctx() context: Context
  ): Promise<OfficerRoleType> {
    await this.requireAdmin(context);
    const row = await this.officerRepo.createRole(name, label, description, sortOrder);
    return { id: row.id, name: row.name, label: row.label, description: row.description, sortOrder: row.sort_order };
  }

  @Mutation(() => OfficerRoleType)
  async updateOfficerRole(
    @Arg('id') id: string,
    @Arg('label', { nullable: true }) label: string,
    @Arg('description', { nullable: true }) description: string,
    @Arg('sortOrder', () => Int, { nullable: true }) sortOrder: number,
    @Ctx() context: Context
  ): Promise<OfficerRoleType> {
    await this.requireAdmin(context);
    const row = await this.officerRepo.updateRole(id, {
      label: label ?? undefined,
      description: description ?? undefined,
      sortOrder: sortOrder ?? undefined,
    });
    if (!row) {
      throw new GraphQLError('Role not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return { id: row.id, name: row.name, label: row.label, description: row.description, sortOrder: row.sort_order };
  }

  @Mutation(() => Boolean)
  async deleteOfficerRole(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);
    return this.officerRepo.deleteRole(id);
  }

  // --- Position assignment queries/mutations ---

  @Query(() => [OfficerPositionType])
  async officerPositions(
    @Arg('termYear') termYear: string
  ): Promise<OfficerPositionType[]> {
    const rows = await this.officerRepo.findByYear(termYear);
    // Fetch roles once for mapping
    const roles = await this.officerRepo.findAllRoles();
    return rows.map(row => {
      const role = roles.find(r => r.name === row.position);
      const result: OfficerPositionType = {
        id: row.id,
        position: row.position,
        termYear: row.term_year,
        holderUserId: row.holder_user_id || undefined,
        holderYouthMemberId: row.holder_youth_member_id || undefined,
        label: role?.label || row.position,
        description: role?.description || '',
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
    });
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
