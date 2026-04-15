import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import {
  ShippingEstimateGQL,
  OrderGQL,
  OrderItemGQL,
  CreatePayPalOrderResultGQL,
  CapturePayPalOrderResultGQL,
  AdminOrderGQL,
} from '../types/Order.type';
import {
  EstimateShippingInput,
  CreatePayPalOrderInput,
} from '../inputs/OrderInput';
import { OrderRepository, OrderWithItemsRow } from '../../repositories/order.repository';
import { PrintfulService } from '../../services/printful.service';
import { PayPalService } from '../../services/paypal.service';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class OrderResolver {
  private orderRepo: OrderRepository;
  private printfulService: PrintfulService;
  private paypalService: PayPalService;
  private userRepo: UserRepository;

  constructor() {
    this.orderRepo = new OrderRepository();
    this.printfulService = new PrintfulService();
    this.paypalService = new PayPalService();
    this.userRepo = new UserRepository();
  }

  // --- Auth helpers ---

  private async requireAdmin(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
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

  private async getOptionalUserId(context: Context): Promise<string | undefined> {
    try {
      const authHeader = context.req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return undefined;
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      return payload.userId;
    } catch {
      return undefined;
    }
  }

  // --- Public queries ---

  @Query(() => OrderGQL, { nullable: true })
  async orderStatus(
    @Arg('confirmationCode') confirmationCode: string,
  ): Promise<OrderGQL | null> {
    const order = await this.orderRepo.findByConfirmationCode(
      confirmationCode.toUpperCase(),
    );
    if (!order) return null;
    return this.mapToOrderGQL(order);
  }

  // --- Public mutations ---

  @Mutation(() => [ShippingEstimateGQL])
  async estimateShipping(
    @Arg('input') input: EstimateShippingInput,
  ): Promise<ShippingEstimateGQL[]> {
    const recipient = {
      name: input.address.name,
      address1: input.address.address1,
      address2: input.address.address2,
      city: input.address.city,
      state_code: input.address.state,
      country_code: input.address.country,
      zip: input.address.zip,
    };

    const items = input.items.map((item) => ({
      sync_variant_id: item.printfulVariantId,
      quantity: item.quantity,
    }));

    const rates = await this.printfulService.getShippingRates(
      recipient,
      items,
    );

    return rates.map((r) => ({
      id: r.id,
      name: r.name,
      rate: r.rate,
      currency: r.currency,
      minDeliveryDays: r.minDeliveryDays,
      maxDeliveryDays: r.maxDeliveryDays,
    }));
  }

  @Mutation(() => CreatePayPalOrderResultGQL)
  async createPayPalOrder(
    @Arg('input') input: CreatePayPalOrderInput,
    @Ctx() context: Context,
  ): Promise<CreatePayPalOrderResultGQL> {
    const confirmationCode = this.orderRepo.generateConfirmationCode();

    // Calculate totals
    const subtotalCents = input.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const totalCents = subtotalCents + input.shippingCents;

    // Create order in database
    const order = await this.orderRepo.createOrder({
      confirmation_code: confirmationCode,
      buyer_email: input.buyerEmail,
      buyer_name: input.buyerName,
      shipping_name: input.address.name,
      shipping_address1: input.address.address1,
      shipping_address2: input.address.address2,
      shipping_city: input.address.city,
      shipping_state: input.address.state,
      shipping_zip: input.address.zip,
      shipping_country: input.address.country,
      subtotal_cents: subtotalCents,
      shipping_cents: input.shippingCents,
      tax_cents: 0,
      total_cents: totalCents,
      user_id: await this.getOptionalUserId(context),
    });

    // Create order items
    await this.orderRepo.createOrderItems(
      order.id,
      input.items.map((item) => ({
        printful_variant_id: item.printfulVariantId,
        printful_product_id: item.printfulProductId,
        product_name: item.productName,
        variant_name: item.variantName,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
      })),
    );

    // Create PayPal order
    const paypalOrderId = await this.paypalService.createOrder(
      totalCents,
      input.items.map((item) => ({
        name: `${item.productName} - ${item.variantName}`,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
      confirmationCode,
    );

    // Store PayPal order ID
    await this.orderRepo.updatePayPalOrderId(order.id, paypalOrderId);

    logger.info(
      `Created order ${confirmationCode} with PayPal order ${paypalOrderId}`,
    );

    return {
      paypalOrderId,
      confirmationCode,
    };
  }

  @Mutation(() => CapturePayPalOrderResultGQL)
  async capturePayPalOrder(
    @Arg('paypalOrderId') paypalOrderId: string,
  ): Promise<CapturePayPalOrderResultGQL> {
    // Find our order by PayPal order ID
    const order = await this.orderRepo.findByPayPalOrderId(paypalOrderId);
    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Capture payment
    const captureResult = await this.paypalService.captureOrder(paypalOrderId);

    if (captureResult.status !== 'COMPLETED') {
      await this.orderRepo.updateStatus(order.id, 'FAILED');
      return {
        success: false,
        confirmationCode: order.confirmation_code,
        status: 'FAILED',
      };
    }

    // Update order to PAID
    await this.orderRepo.updateStatus(order.id, 'PAID');

    // Submit to Printful
    try {
      const orderWithItems = await this.orderRepo.findById(order.id);
      if (!orderWithItems) {
        throw new Error('Order not found after payment');
      }

      const printfulOrder = await this.printfulService.createOrder(
        {
          name: order.shipping_name,
          address1: order.shipping_address1,
          address2: order.shipping_address2 || undefined,
          city: order.shipping_city,
          state_code: order.shipping_state,
          country_code: order.shipping_country,
          zip: order.shipping_zip,
        },
        orderWithItems.items.map((item) => ({
          sync_variant_id: item.printful_variant_id,
          quantity: item.quantity,
        })),
        order.confirmation_code,
      );

      await this.orderRepo.updatePrintfulOrderId(order.id, printfulOrder.id);
      await this.orderRepo.updateStatus(order.id, 'SUBMITTED');

      logger.info(
        `Order ${order.confirmation_code} submitted to Printful as order ${printfulOrder.id}`,
      );
    } catch (error) {
      logger.error(
        `Failed to submit order ${order.confirmation_code} to Printful:`,
        error,
      );
      // Payment was captured but Printful submission failed
      // Keep status as PAID — admin can manually resubmit
    }

    return {
      success: true,
      confirmationCode: order.confirmation_code,
      status: 'SUBMITTED',
    };
  }

  // --- Admin queries ---

  @Query(() => [AdminOrderGQL])
  async adminOrders(
    @Arg('limit', () => Int, { defaultValue: 20 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() context: Context,
  ): Promise<AdminOrderGQL[]> {
    await this.requireAdmin(context);
    const orders = await this.orderRepo.getAdminOrders(limit, offset);
    return orders.map((order) => this.mapToAdminOrderGQL(order));
  }

  @Query(() => Int)
  async adminOrderCount(
    @Ctx() context: Context,
  ): Promise<number> {
    await this.requireAdmin(context);
    return this.orderRepo.getAdminOrderCount();
  }

  // --- Mapping helpers ---

  private mapToOrderGQL(order: OrderWithItemsRow): OrderGQL {
    return {
      id: order.id,
      confirmationCode: order.confirmation_code,
      status: order.status,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      trackingNumber: order.tracking_number || undefined,
      trackingUrl: order.tracking_url || undefined,
      carrier: order.carrier || undefined,
      items: order.items.map((item) => this.mapToOrderItemGQL(item)),
      createdAt: order.created_at,
    };
  }

  private mapToAdminOrderGQL(order: OrderWithItemsRow): AdminOrderGQL {
    const shippingAddress = [
      order.shipping_address1,
      order.shipping_address2,
      `${order.shipping_city}, ${order.shipping_state} ${order.shipping_zip}`,
      order.shipping_country !== 'US' ? order.shipping_country : undefined,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      id: order.id,
      confirmationCode: order.confirmation_code,
      status: order.status,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      trackingNumber: order.tracking_number || undefined,
      trackingUrl: order.tracking_url || undefined,
      carrier: order.carrier || undefined,
      paypalOrderId: order.paypal_order_id || undefined,
      printfulOrderId: order.printful_order_id || undefined,
      shippingAddress,
      userId: order.user_id || undefined,
      items: order.items.map((item) => this.mapToOrderItemGQL(item)),
      createdAt: order.created_at,
    };
  }

  private mapToOrderItemGQL(item: any): OrderItemGQL {
    return {
      id: item.id,
      productName: item.product_name,
      variantName: item.variant_name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    };
  }
}
