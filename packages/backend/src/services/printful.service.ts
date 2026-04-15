import { env } from '../config/env';
import { logger } from '../utils/logger';

// --- Printful API response types ---

export interface PrintfulSyncProduct {
  id: number;
  external_id: string | null;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string | null;
  is_ignored: boolean;
}

export interface PrintfulSyncVariant {
  id: number;
  external_id: string | null;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  is_ignored: boolean;
  sku: string | null;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    id: number;
    type: string;
    hash: string | null;
    url: string | null;
    filename: string;
    mime_type: string;
    size: number;
    width: number;
    height: number;
    dpi: number | null;
    status: string;
    created: number;
    thumbnail_url: string | null;
    preview_url: string | null;
    visible: boolean;
    is_temporary: boolean;
  }>;
  options: Array<{
    id: string;
    value: any;
  }>;
  main_category_id: number | null;
  warehouse_product_variant_id: number | null;
  size?: string;
  color?: string;
  availability_status?: string;
}

export interface PrintfulSyncProductDetail {
  sync_product: PrintfulSyncProduct;
  sync_variants: PrintfulSyncVariant[];
}

interface PrintfulApiResponse<T> {
  code: number;
  result: T;
  extra?: any[];
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

// --- Order / Shipping types ---

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
}

export interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
}

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string; // e.g. "5.95"
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export interface PrintfulOrderResponse {
  id: number;
  external_id: string | null;
  status: string;
  shipping: string;
  shipping_service_name: string;
  created: number;
  updated: number;
  recipient: any;
  items: any[];
  retail_costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
}

// --- Service ---

const BASE_URL = 'https://api.printful.com';
const RATE_LIMIT_DELAY_MS = 600; // ~100 requests/min to stay under 120/min limit

export class PrintfulService {
  private token: string;

  constructor(token?: string) {
    this.token = token || env.PRINTFUL_API_TOKEN;
  }

  private async request<T>(path: string): Promise<PrintfulApiResponse<T>> {
    if (!this.token) {
      throw new Error('PRINTFUL_API_TOKEN is not configured');
    }

    const url = `${BASE_URL}${path}`;
    logger.debug(`Printful API request: GET ${path}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429) {
      // Rate limited — wait and retry once
      const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
      logger.warn(`Printful rate limit hit, retrying after ${retryAfter}s`);
      await this.delay(retryAfter * 1000);

      const retryResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Printful API error (retry): ${retryResponse.status} ${retryResponse.statusText}`);
      }

      return retryResponse.json() as Promise<PrintfulApiResponse<T>>;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Printful API error: ${response.status} ${response.statusText} — ${body}`);
    }

    return response.json() as Promise<PrintfulApiResponse<T>>;
  }

  /**
   * Fetch all synced products (paginated).
   */
  async getSyncProducts(): Promise<PrintfulSyncProduct[]> {
    const allProducts: PrintfulSyncProduct[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.request<PrintfulSyncProduct[]>(
        `/store/products?offset=${offset}&limit=${limit}`
      );

      allProducts.push(...response.result);

      if (!response.paging || allProducts.length >= response.paging.total) {
        break;
      }

      offset += limit;
      await this.delay(RATE_LIMIT_DELAY_MS);
    }

    logger.info(`Fetched ${allProducts.length} synced products from Printful`);
    return allProducts;
  }

  /**
   * Fetch a single synced product with full variant details.
   */
  async getSyncProduct(productId: number): Promise<PrintfulSyncProductDetail> {
    const response = await this.request<PrintfulSyncProductDetail>(
      `/store/products/${productId}`
    );
    return response.result;
  }

  /**
   * Fetch the full catalog: all products with variant details.
   * Calls getSyncProducts, then getSyncProduct for each.
   */
  async fetchFullCatalog(): Promise<PrintfulSyncProductDetail[]> {
    const products = await this.getSyncProducts();
    const details: PrintfulSyncProductDetail[] = [];

    for (const product of products) {
      await this.delay(RATE_LIMIT_DELAY_MS);
      try {
        const detail = await this.getSyncProduct(product.id);
        details.push(detail);
      } catch (error) {
        logger.error(`Failed to fetch product ${product.id} (${product.name}):`, error);
        // Continue with other products
      }
    }

    logger.info(`Fetched full details for ${details.length}/${products.length} products`);
    return details;
  }

  private async postRequest<T>(path: string, body: any): Promise<PrintfulApiResponse<T>> {
    if (!this.token) {
      throw new Error('PRINTFUL_API_TOKEN is not configured');
    }

    const url = `${BASE_URL}${path}`;
    logger.debug(`Printful API request: POST ${path}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
      logger.warn(`Printful rate limit hit, retrying after ${retryAfter}s`);
      await this.delay(retryAfter * 1000);

      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!retryResponse.ok) {
        throw new Error(`Printful API error (retry): ${retryResponse.status} ${retryResponse.statusText}`);
      }

      return retryResponse.json() as Promise<PrintfulApiResponse<T>>;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Printful API error: ${response.status} ${response.statusText} — ${text}`);
    }

    return response.json() as Promise<PrintfulApiResponse<T>>;
  }

  /**
   * Get shipping rates for a set of items + address.
   */
  async getShippingRates(
    recipient: PrintfulRecipient,
    items: PrintfulOrderItem[],
  ): Promise<PrintfulShippingRate[]> {
    const response = await this.postRequest<any[]>('/shipping/rates', {
      recipient,
      items,
    });

    return response.result.map((r: any) => ({
      id: r.id,
      name: r.name,
      rate: r.rate,
      currency: r.currency,
      minDeliveryDays: r.minDeliveryDays ?? r.min_delivery_days ?? 0,
      maxDeliveryDays: r.maxDeliveryDays ?? r.max_delivery_days ?? 0,
    }));
  }

  /**
   * Create an order in Printful.
   */
  async createOrder(
    recipient: PrintfulRecipient,
    items: PrintfulOrderItem[],
    externalId: string,
  ): Promise<PrintfulOrderResponse> {
    const response = await this.postRequest<PrintfulOrderResponse>('/orders', {
      external_id: externalId,
      recipient,
      items,
    });

    logger.info(`Created Printful order ${response.result.id} (external: ${externalId})`);
    return response.result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
