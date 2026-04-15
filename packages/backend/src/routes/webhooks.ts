import { Router, Request, Response } from 'express';
import { PayPalService } from '../services/paypal.service';
import { OrderRepository } from '../repositories/order.repository';
import { logger } from '../utils/logger';

const router = Router();

// PayPal webhook — receives raw body for signature verification
router.post('/paypal', async (req: Request, res: Response) => {
  try {
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const headers = req.headers as Record<string, string>;

    const paypalService = new PayPalService();
    const isValid = await paypalService.verifyWebhookSignature(
      headers,
      rawBody,
    );

    if (!isValid) {
      logger.warn('PayPal webhook signature verification failed');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType: string = event.event_type;

    logger.info(`PayPal webhook event: ${eventType}`);

    const orderRepo = new OrderRepository();

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const customId =
        resource?.custom_id ||
        resource?.supplementary_data?.related_ids?.order_id;

      if (customId) {
        const order = await orderRepo.findByConfirmationCode(customId);
        if (order && order.status === 'PENDING_PAYMENT') {
          await orderRepo.updateStatus(order.id, 'PAID');
          logger.info(
            `PayPal webhook: Order ${customId} marked as PAID`,
          );
        }
      }
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
      const resource = event.resource;
      const customId = resource?.custom_id;

      if (customId) {
        const order = await orderRepo.findByConfirmationCode(customId);
        if (order) {
          await orderRepo.updateStatus(order.id, 'FAILED');
          logger.warn(
            `PayPal webhook: Order ${customId} payment denied`,
          );
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Printful webhook — receives JSON
router.post('/printful', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventType: string = event.type;

    logger.info(`Printful webhook event: ${eventType}`);

    const orderRepo = new OrderRepository();

    if (eventType === 'package_shipped') {
      const shipment = event.data?.shipment;
      const orderId = event.data?.order?.external_id;

      if (orderId && shipment) {
        const order = await orderRepo.findByConfirmationCode(orderId);
        if (order) {
          await orderRepo.updateTracking(order.id, {
            tracking_number: shipment.tracking_number || '',
            tracking_url: shipment.tracking_url,
            carrier: shipment.carrier,
          });
          logger.info(
            `Printful webhook: Order ${orderId} shipped, tracking: ${shipment.tracking_number}`,
          );
        }
      }
    } else if (eventType === 'order_updated') {
      const printfulStatus = event.data?.order?.status;
      const orderId = event.data?.order?.external_id;

      if (orderId && printfulStatus) {
        const order = await orderRepo.findByConfirmationCode(orderId);
        if (order) {
          // Map Printful status to our status
          const statusMap: Record<string, string> = {
            pending: 'SUBMITTED',
            inprocess: 'PROCESSING',
            fulfilled: 'SHIPPED',
            canceled: 'CANCELLED',
          };
          const newStatus = statusMap[printfulStatus];
          if (newStatus) {
            await orderRepo.updateStatus(order.id, newStatus);
            logger.info(
              `Printful webhook: Order ${orderId} status → ${newStatus}`,
            );
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Printful webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
