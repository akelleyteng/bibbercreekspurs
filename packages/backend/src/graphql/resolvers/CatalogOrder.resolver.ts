import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { CatalogOrderGQL, CreateCatalogOrderResultGQL } from '../types/CatalogOrder.type';
import { CreateCatalogOrderInput } from '../inputs/CatalogOrderInput';
import {
  CatalogOrderRepository,
  CatalogOrderWithItems,
} from '../../repositories/catalog-order.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';

@Resolver()
export class CatalogOrderResolver {
  private orderRepo: CatalogOrderRepository;
  private userRepo: UserRepository;

  constructor() {
    this.orderRepo = new CatalogOrderRepository();
    this.userRepo = new UserRepository();
  }

  private mapOrder(row: CatalogOrderWithItems): CatalogOrderGQL {
    return {
      id: row.id,
      confirmationCode: row.confirmation_code,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      subtotalCents: row.subtotal_cents,
      notes: row.notes ?? undefined,
      items: row.items.map((i) => ({
        id: i.id,
        productId: i.product_id ?? undefined,
        productName: i.product_name,
        itemType: i.item_type,
        color: i.color ?? undefined,
        size: i.size ?? undefined,
        decorations: (i.decorations ?? []).map((d) => ({
          label: d.label,
          text: d.text ?? undefined,
          placement: d.placement ?? undefined,
          priceCents: d.priceCents,
        })),
        unitPriceCents: i.unit_price_cents,
        quantity: i.quantity,
      })),
      createdAt: row.created_at,
    };
  }

  private async getAuthUser(context: Context) {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const payload = verifyAccessToken(authHeader.substring(7));
    const user = await this.userRepo.findById(payload.userId);
    if (!user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    return user;
  }

  // ── Order collection (login required) ──

  @Mutation(() => CreateCatalogOrderResultGQL)
  async createCatalogOrder(
    @Arg('input') input: CreateCatalogOrderInput,
    @Ctx() context: Context
  ): Promise<CreateCatalogOrderResultGQL> {
    const user = await this.getAuthUser(context);

    const order = await this.orderRepo.createOrder({
      userId: user.id,
      buyerName: `${user.first_name} ${user.last_name}`.trim(),
      buyerEmail: user.email,
      notes: input.notes,
      items: input.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        itemType: i.itemType,
        color: i.color,
        size: i.size,
        decorations: (i.decorations ?? []).map((d) => ({
          label: d.label,
          text: d.text,
          placement: d.placement,
          priceCents: d.priceCents,
        })),
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
      })),
    });

    return { confirmationCode: order.confirmation_code };
  }

  // ── Public status lookup ──

  @Query(() => CatalogOrderGQL, { nullable: true })
  async catalogOrderStatus(
    @Arg('confirmationCode') confirmationCode: string
  ): Promise<CatalogOrderGQL | null> {
    const order = await this.orderRepo.findByConfirmationCode(confirmationCode.trim());
    return order ? this.mapOrder(order) : null;
  }

  // ── Admin (used by the batch builder in A5) ──

  @Query(() => [CatalogOrderGQL])
  async adminCatalogOrders(@Ctx() context: Context): Promise<CatalogOrderGQL[]> {
    const user = await this.getAuthUser(context);
    if (user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }
    const orders = await this.orderRepo.findAll();
    return orders.map((o) => this.mapOrder(o));
  }
}
