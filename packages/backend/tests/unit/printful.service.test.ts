import { PrintfulService } from '../../src/services/printful.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PrintfulService', () => {
  let service: PrintfulService;

  beforeEach(() => {
    mockFetch.mockReset();
    service = new PrintfulService('test-token');
  });

  const makePrintfulResponse = (result: any, paging?: any) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ code: 200, result, paging }),
  });

  describe('getSyncProducts', () => {
    it('should fetch all synced products', async () => {
      const products = [
        { id: 1, name: 'Club Tee', variants: 5, thumbnail_url: 'https://img.com/tee.jpg' },
        { id: 2, name: 'Club Hoodie', variants: 3, thumbnail_url: 'https://img.com/hoodie.jpg' },
      ];

      mockFetch.mockResolvedValueOnce(
        makePrintfulResponse(products, { total: 2, offset: 0, limit: 100 })
      );

      const result = await service.getSyncProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Club Tee');
      expect(result[1].name).toBe('Club Hoodie');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/store/products?offset=0&limit=100'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        variants: 1,
        thumbnail_url: null,
      }));
      const page2 = [{ id: 101, name: 'Product 101', variants: 1, thumbnail_url: null }];

      mockFetch
        .mockResolvedValueOnce(
          makePrintfulResponse(page1, { total: 101, offset: 0, limit: 100 })
        )
        .mockResolvedValueOnce(
          makePrintfulResponse(page2, { total: 101, offset: 100, limit: 100 })
        );

      const result = await service.getSyncProducts();

      expect(result).toHaveLength(101);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty catalog', async () => {
      mockFetch.mockResolvedValueOnce(
        makePrintfulResponse([], { total: 0, offset: 0, limit: 100 })
      );

      const result = await service.getSyncProducts();

      expect(result).toHaveLength(0);
    });
  });

  describe('getSyncProduct', () => {
    it('should fetch a single product with variants', async () => {
      const detail = {
        sync_product: { id: 1, name: 'Club Tee', thumbnail_url: 'https://img.com/tee.jpg' },
        sync_variants: [
          {
            id: 101,
            name: 'Club Tee - S / Black',
            retail_price: '25.00',
            product: { variant_id: 201, product_id: 301, image: 'https://img.com/variant.jpg', name: 'Bella Canvas 3001' },
            files: [],
            options: [{ id: 'size', value: 'S' }, { id: 'color', value: 'Black' }],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(makePrintfulResponse(detail));

      const result = await service.getSyncProduct(1);

      expect(result.sync_product.name).toBe('Club Tee');
      expect(result.sync_variants).toHaveLength(1);
      expect(result.sync_variants[0].retail_price).toBe('25.00');
    });
  });

  describe('error handling', () => {
    it('should throw on API error (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid token'),
      });

      await expect(service.getSyncProducts()).rejects.toThrow('Printful API error: 401');
    });

    it('should throw on API error (500)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(service.getSyncProducts()).rejects.toThrow('Printful API error: 500');
    });

    it('should retry once on rate limit (429)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: { get: (key: string) => key === 'retry-after' ? '1' : null },
        })
        .mockResolvedValueOnce(
          makePrintfulResponse([], { total: 0, offset: 0, limit: 100 })
        );

      const result = await service.getSyncProducts();

      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw if retry after rate limit also fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: { get: (key: string) => key === 'retry-after' ? '1' : null },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });

      await expect(service.getSyncProducts()).rejects.toThrow('Printful API error (retry): 429');
    });

    it('should throw if token is not configured', async () => {
      const noTokenService = new PrintfulService('');

      await expect(noTokenService.getSyncProducts()).rejects.toThrow(
        'PRINTFUL_API_TOKEN is not configured'
      );
    });
  });

  describe('fetchFullCatalog', () => {
    it('should fetch list then details for each product', async () => {
      const products = [
        { id: 1, name: 'Tee', variants: 2, thumbnail_url: null },
        { id: 2, name: 'Hoodie', variants: 1, thumbnail_url: null },
      ];

      const detail1 = {
        sync_product: { id: 1, name: 'Tee' },
        sync_variants: [{ id: 11, name: 'Tee - S' }],
      };
      const detail2 = {
        sync_product: { id: 2, name: 'Hoodie' },
        sync_variants: [{ id: 21, name: 'Hoodie - M' }],
      };

      mockFetch
        .mockResolvedValueOnce(
          makePrintfulResponse(products, { total: 2, offset: 0, limit: 100 })
        )
        .mockResolvedValueOnce(makePrintfulResponse(detail1))
        .mockResolvedValueOnce(makePrintfulResponse(detail2));

      const result = await service.fetchFullCatalog();

      expect(result).toHaveLength(2);
      expect(result[0].sync_product.name).toBe('Tee');
      expect(result[1].sync_product.name).toBe('Hoodie');
    });

    it('should continue if one product detail fetch fails', async () => {
      const products = [
        { id: 1, name: 'Tee', variants: 2, thumbnail_url: null },
        { id: 2, name: 'Hoodie', variants: 1, thumbnail_url: null },
      ];

      const detail2 = {
        sync_product: { id: 2, name: 'Hoodie' },
        sync_variants: [{ id: 21, name: 'Hoodie - M' }],
      };

      mockFetch
        .mockResolvedValueOnce(
          makePrintfulResponse(products, { total: 2, offset: 0, limit: 100 })
        )
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error'),
        })
        .mockResolvedValueOnce(makePrintfulResponse(detail2));

      const result = await service.fetchFullCatalog();

      // Should still return the one that succeeded
      expect(result).toHaveLength(1);
      expect(result[0].sync_product.name).toBe('Hoodie');
    });
  });
});
