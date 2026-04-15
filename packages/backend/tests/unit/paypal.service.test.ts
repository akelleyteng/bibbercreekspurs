import { PayPalService, OrderItemSummary } from '../../src/services/paypal.service';

// Mock @paypal/paypal-server-sdk
jest.mock('@paypal/paypal-server-sdk', () => {
  const mockCreateOrder = jest.fn();
  const mockCaptureOrder = jest.fn();

  return {
    Client: jest.fn().mockImplementation(() => ({})),
    OrdersController: jest.fn().mockImplementation(() => ({
      createOrder: mockCreateOrder,
      captureOrder: mockCaptureOrder,
    })),
    Environment: { Sandbox: 'sandbox', Production: 'production' },
    CheckoutPaymentIntent: { Capture: 'CAPTURE' },
    __mockCreateOrder: mockCreateOrder,
    __mockCaptureOrder: mockCaptureOrder,
  };
});

// Mock env
jest.mock('../../src/config/env', () => ({
  env: {
    PAYPAL_CLIENT_ID: 'test-client-id',
    PAYPAL_CLIENT_SECRET: 'test-client-secret',
    PAYPAL_WEBHOOK_ID: 'test-webhook-id',
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const sdk = require('@paypal/paypal-server-sdk');
const mockCreateOrder = sdk.__mockCreateOrder as jest.Mock;
const mockCaptureOrder = sdk.__mockCaptureOrder as jest.Mock;

describe('PayPalService', () => {
  let service: PayPalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PayPalService('test-client-id', 'test-client-secret');
  });

  describe('createOrder', () => {
    it('should create a PayPal order and return the order ID', async () => {
      mockCreateOrder.mockResolvedValue({
        result: { id: 'PAYPAL-ORDER-123' },
      });

      const items: OrderItemSummary[] = [
        { name: 'Club Tee - M / Black', quantity: 2, unitPriceCents: 2500 },
      ];

      const result = await service.createOrder(5500, items, 'BCS-ABC123');

      expect(result).toBe('PAYPAL-ORDER-123');
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);

      const callArg = mockCreateOrder.mock.calls[0][0];
      expect(callArg.body.intent).toBe('CAPTURE');
      expect(callArg.body.purchaseUnits[0].customId).toBe('BCS-ABC123');
      expect(callArg.body.purchaseUnits[0].amount.currencyCode).toBe('USD');
      expect(callArg.body.purchaseUnits[0].amount.value).toBe('55.00');
    });

    it('should calculate item total and shipping in breakdown', async () => {
      mockCreateOrder.mockResolvedValue({
        result: { id: 'PAYPAL-ORDER-456' },
      });

      const items: OrderItemSummary[] = [
        { name: 'Tee', quantity: 1, unitPriceCents: 2500 },
        { name: 'Hoodie', quantity: 1, unitPriceCents: 4500 },
      ];

      // Total = 7000 items + 500 shipping = 7500
      await service.createOrder(7500, items, 'BCS-XYZ789');

      const callArg = mockCreateOrder.mock.calls[0][0];
      const breakdown = callArg.body.purchaseUnits[0].amount.breakdown;
      expect(breakdown.itemTotal.value).toBe('70.00');
      expect(breakdown.shipping.value).toBe('5.00');
    });

    it('should throw when PayPal returns no order ID', async () => {
      mockCreateOrder.mockResolvedValue({
        result: { id: undefined },
      });

      await expect(
        service.createOrder(2500, [{ name: 'Tee', quantity: 1, unitPriceCents: 2500 }], 'BCS-FAIL'),
      ).rejects.toThrow('PayPal order creation failed: no order ID returned');
    });
  });

  describe('captureOrder', () => {
    it('should capture a PayPal order and return capture result', async () => {
      mockCaptureOrder.mockResolvedValue({
        result: {
          id: 'PAYPAL-ORDER-123',
          purchaseUnits: [
            {
              payments: {
                captures: [
                  { id: 'CAPTURE-001', status: 'COMPLETED' },
                ],
              },
            },
          ],
          payer: { emailAddress: 'buyer@example.com' },
        },
      });

      const result = await service.captureOrder('PAYPAL-ORDER-123');

      expect(result.paypalOrderId).toBe('PAYPAL-ORDER-123');
      expect(result.captureId).toBe('CAPTURE-001');
      expect(result.status).toBe('COMPLETED');
      expect(result.payerEmail).toBe('buyer@example.com');
    });

    it('should throw when no capture is returned', async () => {
      mockCaptureOrder.mockResolvedValue({
        result: {
          id: 'PAYPAL-ORDER-123',
          purchaseUnits: [{ payments: { captures: [] } }],
        },
      });

      await expect(service.captureOrder('PAYPAL-ORDER-123')).rejects.toThrow(
        'PayPal capture failed for order PAYPAL-ORDER-123',
      );
    });

    it('should handle missing purchaseUnits', async () => {
      mockCaptureOrder.mockResolvedValue({
        result: { id: 'PAYPAL-ORDER-123', purchaseUnits: [] },
      });

      await expect(service.captureOrder('PAYPAL-ORDER-123')).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    const mockHeaders = {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'trans-123',
      'paypal-transmission-sig': 'sig-abc',
      'paypal-transmission-time': '2024-01-01T00:00:00Z',
    };
    const rawBody = '{"event_type":"PAYMENT.CAPTURE.COMPLETED"}';

    beforeEach(() => {
      (global.fetch as jest.Mock) = jest.fn();
    });

    it('should return true for valid webhook signature', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ verification_status: 'SUCCESS' }),
        });

      const result = await service.verifyWebhookSignature(mockHeaders, rawBody);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return false for failed verification', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ verification_status: 'FAILURE' }),
        });

      const result = await service.verifyWebhookSignature(mockHeaders, rawBody);

      expect(result).toBe(false);
    });

    it('should return false when token request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await service.verifyWebhookSignature(mockHeaders, rawBody);

      expect(result).toBe(false);
    });

    it('should return false when verify request fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-token' }),
        })
        .mockResolvedValueOnce({ ok: false });

      const result = await service.verifyWebhookSignature(mockHeaders, rawBody);

      expect(result).toBe(false);
    });
  });
});
