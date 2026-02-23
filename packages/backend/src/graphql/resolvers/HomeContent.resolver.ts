import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { HomeContent } from '../types/HomeContent.type';
import { UpsertHomeContentInput } from '../inputs/HomeContentInput';
import { HomeContentRepository, HomeContentRow } from '../../repositories/home-content.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';

@Resolver()
export class HomeContentResolver {
  private homeContentRepo: HomeContentRepository;
  private userRepo: UserRepository;

  constructor() {
    this.homeContentRepo = new HomeContentRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: HomeContentRow): HomeContent {
    return {
      id: row.id,
      sectionType: row.section_type,
      title: row.title ?? undefined,
      content: row.content,
      imageUrl: row.image_url ?? undefined,
      metadata: row.metadata ?? undefined,
      orderIndex: row.order_index ?? undefined,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async requireAdmin(context: Context): Promise<string> {
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

    return payload.userId;
  }

  @Query(() => [HomeContent])
  async homePageContent(): Promise<HomeContent[]> {
    const rows = await this.homeContentRepo.findActive();
    return rows.map((row) => this.mapRow(row));
  }

  @Query(() => [HomeContent])
  async adminHomePageContent(
    @Ctx() context: Context
  ): Promise<HomeContent[]> {
    await this.requireAdmin(context);
    const rows = await this.homeContentRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Mutation(() => HomeContent)
  async upsertHomeContent(
    @Arg('input') input: UpsertHomeContentInput,
    @Ctx() context: Context
  ): Promise<HomeContent> {
    const userId = await this.requireAdmin(context);

    const row = await this.homeContentRepo.upsert({
      section_type: input.sectionType,
      title: input.title,
      content: input.content ?? '',
      image_url: input.imageUrl,
      metadata: input.metadata,
      order_index: input.orderIndex,
      is_active: input.isActive,
      updated_by: userId,
    });

    return this.mapRow(row);
  }
}
