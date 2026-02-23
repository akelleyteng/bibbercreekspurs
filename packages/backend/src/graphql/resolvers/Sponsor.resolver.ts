import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { Sponsor } from '../types/Sponsor.type';
import { CreateSponsorInput, UpdateSponsorInput } from '../inputs/SponsorInput';
import { SponsorRepository, SponsorRow } from '../../repositories/sponsor.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class SponsorResolver {
  private sponsorRepo: SponsorRepository;
  private userRepo: UserRepository;

  constructor() {
    this.sponsorRepo = new SponsorRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: SponsorRow): Sponsor {
    return {
      id: row.id,
      name: row.name,
      logoUrl: row.logo_url,
      websiteUrl: row.website_url,
      description: row.description,
      orderIndex: row.order_index,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

  @Query(() => [Sponsor])
  async sponsors(
    @Arg('activeOnly', { nullable: true, defaultValue: true }) activeOnly: boolean
  ): Promise<Sponsor[]> {
    const rows = activeOnly
      ? await this.sponsorRepo.findActive()
      : await this.sponsorRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Mutation(() => Sponsor)
  async createSponsor(
    @Arg('input') input: CreateSponsorInput,
    @Ctx() context: Context
  ): Promise<Sponsor> {
    await this.requireAdmin(context);

    const row = await this.sponsorRepo.create({
      name: input.name,
      logo_url: input.logoUrl,
      website_url: input.websiteUrl,
      description: input.description,
      order_index: input.orderIndex,
    });

    return this.mapRow(row);
  }

  @Mutation(() => Sponsor)
  async updateSponsor(
    @Arg('id') id: string,
    @Arg('input') input: UpdateSponsorInput,
    @Ctx() context: Context
  ): Promise<Sponsor> {
    await this.requireAdmin(context);

    const data: Record<string, any> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.logoUrl !== undefined) data.logo_url = input.logoUrl;
    if (input.websiteUrl !== undefined) data.website_url = input.websiteUrl;
    if (input.description !== undefined) data.description = input.description;
    if (input.orderIndex !== undefined) data.order_index = input.orderIndex;
    if (input.isActive !== undefined) data.is_active = input.isActive;

    const row = await this.sponsorRepo.update(id, data);

    if (!row) {
      throw new GraphQLError('Sponsor not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteSponsor(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await this.sponsorRepo.delete(id);

    if (!deleted) {
      throw new GraphQLError('Sponsor not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }
}
