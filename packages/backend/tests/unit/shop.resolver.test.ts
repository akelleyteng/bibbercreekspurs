import { ShopResolver } from '../../src/graphql/resolvers/Shop.resolver';
import { ShopProductRepository } from '../../src/repositories/shop-product.repository';
import { PrintfulService } from '../../src/services/printful.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { verifyAccessToken } from '../../src/services/auth.service';

// Mock dependencies
jest.mock('../../src/repositories/shop-product.repository');
jest.mock('../../src/services/printful.service');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/services/auth.service');

const MockShopRepo = ShopProductRepository as jest.MockedClass<typeof ShopProductRepository>;
const MockPrintfulService = PrintfulService as jest.MockedClass<typeof PrintfulService>;
const MockUserRepo = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockVerifyToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

describe('ShopResolver', () => {
  let resolver: ShopResolver;
  let mockShopRepo: jest.Mocked<ShopProductRepository>;
  let mockPrintful: jest.Mocked<PrintfulService>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  const adminContext = {
    req: { headers: { authorization: 'Bearer admin-token' } },
    res: {},
  } as any;

  const publicContext = {
    req: { headers: {} },
    res: {},
  } as any;

  const mockJoinedRow = {
    id: 'pp-1',
    printful_id: 123,
    external_id: null,
    name: 'Club Tee',
    description: 'A great tee',
    thumbnail_url: 'https://img.com/tee.jpg',
    printful_data: {
      sync_product: { id: 123, name: 'Club Tee' },
      sync_variants: [
        {
          id: 1001,
          name: 'Club Tee - S / Black',
          retail_price: '11.50',
          product: { variant_id: 201, product_id: 301, image: 'https://img.com/v.jpg', name: 'Bella' },
          files: [{ type: 'preview', preview_url: 'https://img.com/preview.jpg' }],
          options: [{ id: 'size', value: 'S' }, { id: 'color', value: 'Black' }],
          availability_status: 'active',
        },
      ],
    },
    synced_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    shop_product_id: 'sp-1',
    is_visible: true,
    retail_price_cents: 2500,
    credit_eligible: false,
    sort_order: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    resolver = new ShopResolver();

    // Get the mocked instances created by the constructor
    mockShopRepo = MockShopRepo.mock.instances[0] as any;
    mockPrintful = MockPrintfulService.mock.instances[0] as any;
    mockUserRepo = MockUserRepo.mock.instances[0] as any;

    // Setup admin auth
    mockVerifyToken.mockReturnValue({ userId: 'admin-id', email: 'admin@test.com', type: 'access' } as any);
    mockUserRepo.findById = jest.fn().mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
  });

  describe('shopProducts (public query)', () => {
    it('should return only visible products', async () => {
      mockShopRepo.getVisibleProducts = jest.fn().mockResolvedValue([mockJoinedRow]);
      mockShopRepo.getLastSyncTime = jest.fn().mockResolvedValue(new Date());

      const result = await resolver.shopProducts();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Club Tee');
      expect(result[0].printfulId).toBe(123);
      expect(result[0].retailPriceCents).toBe(2500);
    });

    it('should return empty array when no visible products', async () => {
      mockShopRepo.getVisibleProducts = jest.fn().mockResolvedValue([]);
      mockShopRepo.getLastSyncTime = jest.fn().mockResolvedValue(new Date());

      const result = await resolver.shopProducts();

      expect(result).toHaveLength(0);
    });

    it('should extract variant data from printful_data', async () => {
      mockShopRepo.getVisibleProducts = jest.fn().mockResolvedValue([mockJoinedRow]);
      mockShopRepo.getLastSyncTime = jest.fn().mockResolvedValue(new Date());

      const result = await resolver.shopProducts();

      expect(result[0].variants).toHaveLength(1);
      expect(result[0].variants[0].variantId).toBe(1001);
      expect(result[0].variants[0].size).toBe('S');
      expect(result[0].variants[0].color).toBe('Black');
      expect(result[0].variants[0].inStock).toBe(true);
    });

    it('should use retail price from curation layer, not Printful', async () => {
      mockShopRepo.getVisibleProducts = jest.fn().mockResolvedValue([mockJoinedRow]);
      mockShopRepo.getLastSyncTime = jest.fn().mockResolvedValue(new Date());

      const result = await resolver.shopProducts();

      // Retail price should come from shop_products (2500 cents = $25)
      expect(result[0].retailPriceCents).toBe(2500);
    });
  });

  describe('shopProduct (single product query)', () => {
    it('should return a product by printful ID', async () => {
      mockShopRepo.getVisibleProductByPrintfulId = jest.fn().mockResolvedValue(mockJoinedRow);

      const result = await resolver.shopProduct(123);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Club Tee');
    });

    it('should return null for non-existent product', async () => {
      mockShopRepo.getVisibleProductByPrintfulId = jest.fn().mockResolvedValue(null);

      const result = await resolver.shopProduct(999);

      expect(result).toBeNull();
    });

    it('should return null for hidden product', async () => {
      mockShopRepo.getVisibleProductByPrintfulId = jest.fn().mockResolvedValue(null);

      const result = await resolver.shopProduct(123);

      expect(result).toBeNull();
    });
  });

  describe('adminShopProducts (admin query)', () => {
    it('should return all products for admin', async () => {
      const hiddenRow = { ...mockJoinedRow, is_visible: false, shop_product_id: 'sp-2' };
      mockShopRepo.getAllProductsWithCuration = jest.fn().mockResolvedValue([mockJoinedRow, hiddenRow]);

      const result = await resolver.adminShopProducts(adminContext);

      expect(result).toHaveLength(2);
    });

    it('should throw UNAUTHENTICATED for unauthenticated request', async () => {
      await expect(resolver.adminShopProducts(publicContext)).rejects.toThrow('Not authenticated');
    });

    it('should throw FORBIDDEN for non-admin user', async () => {
      mockUserRepo.findById = jest.fn().mockResolvedValue({ id: 'user-id', role: 'PARENT' });

      await expect(resolver.adminShopProducts(adminContext)).rejects.toThrow('Admin access required');
    });
  });

  describe('syncPrintfulProducts (admin mutation)', () => {
    it('should sync products from Printful and return result', async () => {
      const catalog = [
        {
          sync_product: { id: 1, name: 'Tee', external_id: null, thumbnail_url: null },
          sync_variants: [],
        },
      ];
      mockPrintful.fetchFullCatalog = jest.fn().mockResolvedValue(catalog);
      mockShopRepo.upsertPrintfulProduct = jest.fn().mockResolvedValue({});
      mockShopRepo.removeProductsNotIn = jest.fn().mockResolvedValue(0);

      const result = await resolver.syncPrintfulProducts(adminContext);

      expect(result.synced).toBe(1);
      expect(result.removed).toBe(0);
      expect(mockPrintful.fetchFullCatalog).toHaveBeenCalledTimes(1);
    });

    it('should require admin access', async () => {
      mockUserRepo.findById = jest.fn().mockResolvedValue({ id: 'user-id', role: 'PARENT' });

      await expect(resolver.syncPrintfulProducts(adminContext)).rejects.toThrow('Admin access required');
    });
  });

  describe('updateShopProductCuration (admin mutation)', () => {
    it('should update visibility', async () => {
      mockShopRepo.updateCuration = jest.fn().mockResolvedValue({});
      mockShopRepo.getAllProductsWithCuration = jest.fn().mockResolvedValue([
        { ...mockJoinedRow, is_visible: false },
      ]);

      const result = await resolver.updateShopProductCuration(
        'sp-1',
        { isVisible: false },
        adminContext
      );

      expect(mockShopRepo.updateCuration).toHaveBeenCalledWith('sp-1', {
        is_visible: false,
        retail_price_cents: undefined,
        credit_eligible: undefined,
        sort_order: undefined,
      });
    });

    it('should update retail price', async () => {
      mockShopRepo.updateCuration = jest.fn().mockResolvedValue({});
      mockShopRepo.getAllProductsWithCuration = jest.fn().mockResolvedValue([
        { ...mockJoinedRow, retail_price_cents: 3000 },
      ]);

      await resolver.updateShopProductCuration(
        'sp-1',
        { retailPriceCents: 3000 },
        adminContext
      );

      expect(mockShopRepo.updateCuration).toHaveBeenCalledWith('sp-1', expect.objectContaining({
        retail_price_cents: 3000,
      }));
    });

    it('should update credit eligibility', async () => {
      mockShopRepo.updateCuration = jest.fn().mockResolvedValue({});
      mockShopRepo.getAllProductsWithCuration = jest.fn().mockResolvedValue([
        { ...mockJoinedRow, credit_eligible: true },
      ]);

      await resolver.updateShopProductCuration(
        'sp-1',
        { creditEligible: true },
        adminContext
      );

      expect(mockShopRepo.updateCuration).toHaveBeenCalledWith('sp-1', expect.objectContaining({
        credit_eligible: true,
      }));
    });

    it('should throw NOT_FOUND for non-existent product', async () => {
      mockShopRepo.updateCuration = jest.fn().mockResolvedValue({});
      mockShopRepo.getAllProductsWithCuration = jest.fn().mockResolvedValue([]);

      await expect(
        resolver.updateShopProductCuration('nonexistent', { isVisible: true }, adminContext)
      ).rejects.toThrow('Shop product not found');
    });
  });
});
