import {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
} from '@paypal/paypal-server-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface OrderItemSummary {
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CaptureResult {
  paypalOrderId: string;
  captureId: string;
  status: string;
  payerEmail?: string;
}

export class PayPalService {
  private ordersController: OrdersController;

  constructor(clientId?: string, clientSecret?: string) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId || env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: clientSecret || env.PAYPAL_CLIENT_SECRET,
      },
      environment:
        process.env.NODE_ENV === 'production'
          ? Environment.Production
          : Environment.Sandbox,
    });

    this.ordersController = new OrdersController(client);
  }

  /**
   * Create a PayPal order for the given total.
   * Returns the PayPal order ID for the frontend to approve.
   */
  async createOrder(
    totalCents: number,
    items: OrderItemSummary[],
    confirmationCode: string,
  ): Promise<string> {
    const totalDollars = (totalCents / 100).toFixed(2);

    const paypalItems = items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unitAmount: {
        currencyCode: 'USD',
        value: (item.unitPriceCents / 100).toFixed(2),
      },
    }));

    const itemTotal = items.reduce(
      (sum, i) => sum + i.unitPriceCents * i.quantity,
      0,
    );
    const itemTotalDollars = (itemTotal / 100).toFixed(2);
    const shippingDollars = ((totalCents - itemTotal) / 100).toFixed(2);

    const response = await this.ordersController.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            customId: confirmationCode,
            amount: {
              currencyCode: 'USD',
              value: totalDollars,
              breakdown: {
                itemTotal: { currencyCode: 'USD', value: itemTotalDollars },
                shipping: { currencyCode: 'USD', value: shippingDollars },
              },
            },
            items: paypalItems,
          },
        ],
      },
      prefer: 'return=representation',
    });

    const order = response.result;
    if (!order.id) {
      throw new Error('PayPal order creation failed: no order ID returned');
    }

    logger.info(
      `Created PayPal order ${order.id} for ${confirmationCode} ($${totalDollars})`,
    );
    return order.id;
  }

  /**
   * Capture a PayPal order after buyer approval.
   */
  async captureOrder(paypalOrderId: string): Promise<CaptureResult> {
    const response = await this.ordersController.captureOrder({
      id: paypalOrderId,
      prefer: 'return=representation',
    });

    const order = response.result;
    const capture =
      order.purchaseUnits?.[0]?.payments?.captures?.[0];

    if (!capture) {
      throw new Error(`PayPal capture failed for order ${paypalOrderId}`);
    }

    logger.info(
      `Captured PayPal order ${paypalOrderId}, capture ID: ${capture.id}`,
    );

    return {
      paypalOrderId: order.id!,
      captureId: capture.id!,
      status: capture.status || 'UNKNOWN',
      payerEmail: order.payer?.emailAddress,
    };
  }

  /**
   * Verify a PayPal webhook signature using the PayPal REST API.
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<boolean> {
    const webhookId = env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      logger.warn('PAYPAL_WEBHOOK_ID not configured, skipping verification');
      return false;
    }

    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    // Get an access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`,
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      logger.error('Failed to get PayPal access token for webhook verification');
      return false;
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    // Verify the webhook signature
    const verifyResponse = await fetch(
      `${baseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      },
    );

    if (!verifyResponse.ok) {
      logger.error('PayPal webhook verification request failed');
      return false;
    }

    const verifyData = (await verifyResponse.json()) as {
      verification_status: string;
    };
    return verifyData.verification_status === 'SUCCESS';
  }
}
