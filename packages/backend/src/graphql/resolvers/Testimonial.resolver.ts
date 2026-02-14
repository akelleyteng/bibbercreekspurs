import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { Testimonial } from '../types/Testimonial.type';
import { CreateTestimonialInput, UpdateTestimonialInput } from '../inputs/TestimonialInput';
import { TestimonialRepository, TestimonialRow } from '../../repositories/testimonial.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class TestimonialResolver {
  private testimonialRepo: TestimonialRepository;
  private userRepo: UserRepository;

  constructor() {
    this.testimonialRepo = new TestimonialRepository();
    this.userRepo = new UserRepository();
  }

  private mapRow(row: TestimonialRow): Testimonial {
    return {
      id: row.id,
      authorName: row.author_name,
      authorRole: row.author_role,
      content: row.content,
      imageUrl: row.image_url,
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

  @Query(() => [Testimonial])
  async testimonials(
    @Arg('activeOnly', { nullable: true, defaultValue: true }) activeOnly: boolean
  ): Promise<Testimonial[]> {
    const rows = activeOnly
      ? await this.testimonialRepo.findActive()
      : await this.testimonialRepo.findAll();
    return rows.map((row) => this.mapRow(row));
  }

  @Mutation(() => Testimonial)
  async createTestimonial(
    @Arg('input') input: CreateTestimonialInput,
    @Ctx() context: Context
  ): Promise<Testimonial> {
    await this.requireAdmin(context);

    const row = await this.testimonialRepo.create({
      author_name: input.authorName,
      author_role: input.authorRole,
      content: input.content,
      image_url: input.imageUrl,
      order_index: input.orderIndex,
    });

    return this.mapRow(row);
  }

  @Mutation(() => Testimonial)
  async updateTestimonial(
    @Arg('id') id: string,
    @Arg('input') input: UpdateTestimonialInput,
    @Ctx() context: Context
  ): Promise<Testimonial> {
    await this.requireAdmin(context);

    const data: Record<string, any> = {};
    if (input.authorName !== undefined) data.author_name = input.authorName;
    if (input.authorRole !== undefined) data.author_role = input.authorRole;
    if (input.content !== undefined) data.content = input.content;
    if (input.imageUrl !== undefined) data.image_url = input.imageUrl;
    if (input.orderIndex !== undefined) data.order_index = input.orderIndex;
    if (input.isActive !== undefined) data.is_active = input.isActive;

    const row = await this.testimonialRepo.update(id, data);

    if (!row) {
      throw new GraphQLError('Testimonial not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapRow(row);
  }

  @Mutation(() => Boolean)
  async deleteTestimonial(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await this.testimonialRepo.delete(id);

    if (!deleted) {
      throw new GraphQLError('Testimonial not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return true;
  }
}
