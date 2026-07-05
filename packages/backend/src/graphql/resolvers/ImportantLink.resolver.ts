import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { ImportantLink } from '../types/ImportantLink.type';
import { CreateImportantLinkInput, UpdateImportantLinkInput } from '../inputs/ImportantLinkInput';
import { ImportantLinkRepository, ImportantLinkRow } from '../../repositories/important-link.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';

@Resolver()
export class ImportantLinkResolver {
  private linkRepo: ImportantLinkRepository;
  private userRepo: UserRepository;

  constructor() {
    this.linkRepo = new ImportantLinkRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: ImportantLinkRow): ImportantLink {
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      category: row.category ?? undefined,
      description: row.description ?? undefined,
      orderIndex: row.order_index ?? undefined,
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

  @Query(() => [ImportantLink])
  async importantLinks(
    @Arg('activeOnly', { nullable: true, defaultValue: true }) activeOnly: boolean
  ): Promise<ImportantLink[]> {
    const rows = activeOnly
      ? await this.linkRepo.findActive()
      : await this.linkRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Mutation(() => ImportantLink)
  async createImportantLink(
    @Arg('input') input: CreateImportantLinkInput,
    @Ctx() context: Context
  ): Promise<ImportantLink> {
    await this.requireAdmin(context);

    const row = await this.linkRepo.create({
      title: input.title,
      url: input.url,
      category: input.category,
      description: input.description,
      order_index: input.orderIndex,
    });

    return this.mapRow(row);
  }

  @Mutation(() => ImportantLink)
  async updateImportantLink(
    @Arg('id') id: string,
    @Arg('input') input: UpdateImportantLinkInput,
    @Ctx() context: Context
  ): Promise<ImportantLink> {
    await this.requireAdmin(context);

    const data: Record<string, any> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.url !== undefined) data.url = input.url;
    if (input.category !== undefined) data.category = input.category;
    if (input.description !== undefined) data.description = input.description;
    if (input.orderIndex !== undefined) data.order_index = input.orderIndex;
    if (input.isActive !== undefined) data.is_active = input.isActive;

    const row = await this.linkRepo.update(id, data);

    if (!row) {
      throw new GraphQLError('Important link not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteImportantLink(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await this.linkRepo.delete(id);

    if (!deleted) {
      throw new GraphQLError('Important link not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }
}
