import { OrderResolver } from '../../src/graphql/resolvers/Order.resolver';
import { OrderRepository } from '../../src/repositories/order.repository';
import { PrintfulService } from '../../src/services/printful.service';
import { PayPalService } from '../../src/services/paypal.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { verifyAccessToken } from '../../src/services/auth.service';

// Mock dependencies
jest.mock('../../src/repositories/order.repository');
jest.mock('../../src/services/printful.service');
jest.mock('../../src/services/paypal.service');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/services/auth.service');
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const MockOrderRepo = OrderRepository as jest.MockedClass<typeof OrderRepository>;
const MockPrintfulService = PrintfulService as jest.MockedClass<typeof PrintfulService>;
const MockPayPalService = PayPalService as jest.MockedClass<typeof PayPalService>;
const MockUserRepo = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockVerifyToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

describe('OrderResolver', () => {
  let resolver: OrderResolver;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockPrintful: jest.Mocked<PrintfulService>;
  let mockPaypal: jest.Mocked<PayPalService>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  const adminContext = {
    req: { headers: { authorization: 'Bearer admin-token' } },
    res: {},
  } as any;

  const publicContext = {
    req: { headers: {} },
    res: {},
  } as any;

  const mockOrderRow = {
    id: 'order-1',
    confirmation_code: 'BCS-ABC123',
    paypal_order_id: 'PAYPAL-001',
    printful_order_id: null,
    status: 'PENDING_PAYMENT',
    buyer_email: 'buyer@test.com',
    buyer_name: 'Jane Doe',
    shipping_name: 'Jane Doe',
    shipping_address1: '123 Main St',
    shipping_address2: null,
    shipping_city: 'Denver',
    shipping_state: 'CO',
    shipping_zip: '80202',
    shipping_country: 'US',
    subtotal_cents: 2500,
    shipping_cents: 500,
    tax_cents: 0,
    total_cents: 3000,
    tracking_number: null,
    tracking_url: null,
    carrier: null,
    user_id: null,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
  };

  const mockOrderWithItems = {
    ...mockOrderRow,
    items: [
      {
        id: 'item-1',
        order_id: 'order-1',
        printful_variant_id: 1001,
        printful_product_id: 123,
        product_name: 'Club Tee',
        variant_name: 'M / Black',
        quantity: 1,
        unit_price_cents: 2500,
        created_at: new Date(),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    resolver = new OrderResolver();

    mockOrderRepo = MockOrderRepo.mock.instances[0] as any;
    mockPrintful = MockPrintfulService.mock.instances[0] as any;
    mockPaypal = MockPayPalService.mock.instances[0] as any;
    mockUserRepo = MockUserRepo.mock.instances[0] as any;

    // Setup admin auth
    mockVerifyToken.mockReturnValue({
      userId: 'admin-id',
      email: 'admin@test.com',
      type: 'access',
    } as any);
    mockUserRepo.findById = jest.fn().mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
  });

  describe('orderStatus (public query)', () => {
    it('should return order by confirmation code', async () => {
      mockOrderRepo.findByConfirmationCode = jest.fn().mockResolvedValue(mockOrderWithItems);

      const result = await resolver.orderStatus('BCS-ABC123');

      expect(result).not.toBeNull();
      expect(result!.confirmationCode).toBe('BCS-ABC123');
      expect(result!.status).toBe('PENDING_PAYMENT');
      expect(result!.buyerEmail).toBe('buyer@test.com');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productName).toBe('Club Tee');
    });

    it('should return null for non-existent order', async () => {
      mockOrderRepo.findByConfirmationCode = jest.fn().mockResolvedValue(null);

      const result = await resolver.orderStatus('BCS-NOTFOUND');

      expect(result).toBeNull();
    });

    it('should uppercase the confirmation code', async () => {
      mockOrderRepo.findByConfirmationCode = jest.fn().mockResolvedValue(null);

      await resolver.orderStatus('bcs-abc123');

      expect(mockOrderRepo.findByConfirmationCode).toHaveBeenCalledWith('BCS-ABC123');
    });
  });

  describe('estimateShipping (public mutation)', () => {
    it('should call Printful shipping rates API and return estimates', async () => {
      mockPrintful.getShippingRates = jest.fn().mockResolvedValue([
        {
          id: 'STANDARD',
          name: 'Standard Shipping',
          rate: '5.95',
          currency: 'USD',
          minDeliveryDays: 5,
          maxDeliveryDays: 8,
        },
        {
          id: 'EXPRESS',
          name: 'Express Shipping',
          rate: '12.95',
          currency: 'USD',
          minDeliveryDays: 2,
          maxDeliveryDays: 3,
        },
      ]);

      const input = {
        address: {
          name: 'Jane Doe',
          address1: '123 Main St',
          city: 'Denver',
          state: 'CO',
          zip: '80202',
          country: 'US',
        },
        items: [
          {
            printfulVariantId: 1001,
            printfulProductId: 123,
            productName: 'Club Tee',
            variantName: 'M / Black',
            quantity: 1,
            unitPriceCents: 2500,
          },
        ],
      };

      const result = await resolver.estimateShipping(input);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Standard Shipping');
      expect(result[0].rate).toBe('5.95');
      expect(result[1].name).toBe('Express Shipping');

      expect(mockPrintful.getShippingRates).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          address1: '123 Main St',
          state_code: 'CO',
          country_code: 'US',
        }),
        [{ sync_variant_id: 1001, quantity: 1 }],
      );
    });
  });

  describe('createPayPalOrder (public mutation)', () => {
    const createInput = {
      buyerEmail: 'buyer@test.com',
      buyerName: 'Jane Doe',
      address: {
        name: 'Jane Doe',
        address1: '123 Main St',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        country: 'US',
      },
      items: [
        {
          printfulVariantId: 1001,
          printfulProductId: 123,
          productName: 'Club Tee',
          variantName: 'M / Black',
          quantity: 1,
          unitPriceCents: 2500,
        },
      ],
      shippingRateId: 'STANDARD',
      shippingCents: 595,
    };

    it('should create DB order and PayPal order, return IDs', async () => {
      mockOrderRepo.generateConfirmationCode = jest.fn().mockReturnValue('BCS-NEW123');
      mockOrderRepo.createOrder = jest.fn().mockResolvedValue({ id: 'order-new' });
      mockOrderRepo.createOrderItems = jest.fn().mockResolvedValue(undefined);
      mockOrderRepo.updatePayPalOrderId = jest.fn().mockResolvedValue(undefined);
      mockPaypal.createOrder = jest.fn().mockResolvedValue('PAYPAL-NEW-001');

      const result = await resolver.createPayPalOrder(createInput, publicContext);

      expect(result.confirmationCode).toBe('BCS-NEW123');
      expect(result.paypalOrderId).toBe('PAYPAL-NEW-001');

      // Should create DB order with correct totals
      expect(mockOrderRepo.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmation_code: 'BCS-NEW123',
          buyer_email: 'buyer@test.com',
          subtotal_cents: 2500,
          shipping_cents: 595,
          total_cents: 3095,
        }),
      );

      // Should create items
      expect(mockOrderRepo.createOrderItems).toHaveBeenCalledWith(
        'order-new',
        expect.arrayContaining([
          expect.objectContaining({
            printful_variant_id: 1001,
            product_name: 'Club Tee',
          }),
        ]),
      );

      // Should store PayPal order ID
      expect(mockOrderRepo.updatePayPalOrderId).toHaveBeenCalledWith(
        'order-new',
        'PAYPAL-NEW-001',
      );
    });

    it('should calculate correct subtotal for multiple items', async () => {
      const multiItemInput = {
        ...createInput,
        items: [
          { ...createInput.items[0], quantity: 2 },
          {
            printfulVariantId: 2002,
            printfulProductId: 456,
            productName: 'Club Hoodie',
            variantName: 'L / Navy',
            quantity: 1,
            unitPriceCents: 4500,
          },
        ],
      };

      mockOrderRepo.generateConfirmationCode = jest.fn().mockReturnValue('BCS-MULTI');
      mockOrderRepo.createOrder = jest.fn().mockResolvedValue({ id: 'order-multi' });
      mockOrderRepo.createOrderItems = jest.fn().mockResolvedValue(undefined);
      mockOrderRepo.updatePayPalOrderId = jest.fn().mockResolvedValue(undefined);
      mockPaypal.createOrder = jest.fn().mockResolvedValue('PAYPAL-MULTI');

      await resolver.createPayPalOrder(multiItemInput, publicContext);

      // Subtotal: (2500 * 2) + (4500 * 1) = 9500
      expect(mockOrderRepo.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal_cents: 9500,
          total_cents: 9500 + 595,
        }),
      );
    });
  });

  describe('capturePayPalOrder (public mutation)', () => {
    it('should capture payment, submit to Printful, return success', async () => {
      mockOrderRepo.findByPayPalOrderId = jest.fn().mockResolvedValue(mockOrderRow);
      mockPaypal.captureOrder = jest.fn().mockResolvedValue({
        paypalOrderId: 'PAYPAL-001',
        captureId: 'CAPTURE-001',
        status: 'COMPLETED',
        payerEmail: 'buyer@test.com',
      });
      mockOrderRepo.updateStatus = jest.fn().mockResolvedValue(undefined);
      mockOrderRepo.findById = jest.fn().mockResolvedValue(mockOrderWithItems);
      mockPrintful.createOrder = jest.fn().mockResolvedValue({ id: 12345 });
      mockOrderRepo.updatePrintfulOrderId = jest.fn().mockResolvedValue(undefined);

      const result = await resolver.capturePayPalOrder('PAYPAL-001');

      expect(result.success).toBe(true);
      expect(result.confirmationCode).toBe('BCS-ABC123');
      expect(result.status).toBe('SUBMITTED');

      // Should update to PAID first, then SUBMITTED
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('order-1', 'PAID');
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('order-1', 'SUBMITTED');

      // Should create Printful order
      expect(mockPrintful.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          address1: '123 Main St',
          state_code: 'CO',
        }),
        expect.arrayContaining([
          expect.objectContaining({ sync_variant_id: 1001, quantity: 1 }),
        ]),
        'BCS-ABC123',
      );
    });

    it('should return FAILED when capture status is not COMPLETED', async () => {
      mockOrderRepo.findByPayPalOrderId = jest.fn().mockResolvedValue(mockOrderRow);
      mockPaypal.captureOrder = jest.fn().mockResolvedValue({
        paypalOrderId: 'PAYPAL-001',
        captureId: 'CAPTURE-001',
        status: 'DECLINED',
      });
      mockOrderRepo.updateStatus = jest.fn().mockResolvedValue(undefined);

      const result = await resolver.capturePayPalOrder('PAYPAL-001');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('order-1', 'FAILED');
    });

    it('should throw when order not found', async () => {
      mockOrderRepo.findByPayPalOrderId = jest.fn().mockResolvedValue(null);

      await expect(resolver.capturePayPalOrder('PAYPAL-NONEXIST')).rejects.toThrow(
        'Order not found',
      );
    });

    it('should keep PAID status if Printful submission fails', async () => {
      mockOrderRepo.findByPayPalOrderId = jest.fn().mockResolvedValue(mockOrderRow);
      mockPaypal.captureOrder = jest.fn().mockResolvedValue({
        paypalOrderId: 'PAYPAL-001',
        captureId: 'CAPTURE-001',
        status: 'COMPLETED',
      });
      mockOrderRepo.updateStatus = jest.fn().mockResolvedValue(undefined);
      mockOrderRepo.findById = jest.fn().mockResolvedValue(mockOrderWithItems);
      mockPrintful.createOrder = jest.fn().mockRejectedValue(new Error('Printful API down'));

      const result = await resolver.capturePayPalOrder('PAYPAL-001');

      // Still returns success — payment was captured
      expect(result.success).toBe(true);
      expect(result.confirmationCode).toBe('BCS-ABC123');

      // Should update to PAID but NOT to SUBMITTED
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('order-1', 'PAID');
      expect(mockOrderRepo.updateStatus).not.toHaveBeenCalledWith('order-1', 'SUBMITTED');
    });
  });

  describe('adminOrders (admin query)', () => {
    it('should return paginated orders for admin', async () => {
      mockOrderRepo.getAdminOrders = jest.fn().mockResolvedValue([mockOrderWithItems]);

      const result = await resolver.adminOrders(20, 0, adminContext);

      expect(result).toHaveLength(1);
      expect(result[0].confirmationCode).toBe('BCS-ABC123');
      expect(result[0].shippingAddress).toContain('123 Main St');
      expect(result[0].shippingAddress).toContain('Denver, CO 80202');
    });

    it('should throw UNAUTHENTICATED for public request', async () => {
      await expect(resolver.adminOrders(20, 0, publicContext)).rejects.toThrow(
        'Not authenticated',
      );
    });

    it('should throw FORBIDDEN for non-admin user', async () => {
      mockUserRepo.findById = jest.fn().mockResolvedValue({ id: 'user-id', role: 'PARENT' });

      await expect(resolver.adminOrders(20, 0, adminContext)).rejects.toThrow(
        'Admin access required',
      );
    });
  });

  describe('adminOrderCount (admin query)', () => {
    it('should return order count for admin', async () => {
      mockOrderRepo.getAdminOrderCount = jest.fn().mockResolvedValue(42);

      const result = await resolver.adminOrderCount(adminContext);

      expect(result).toBe(42);
    });

    it('should throw UNAUTHENTICATED for public request', async () => {
      await expect(resolver.adminOrderCount(publicContext)).rejects.toThrow(
        'Not authenticated',
      );
    });
  });
});
