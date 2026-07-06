import { CatalogRepository } from '../../src/repositories/catalog.repository';
import db from '../../src/models/database';

jest.mock('../../src/models/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

const productRow = {
  id: 'prod-1',
  item_type: 'Hoodie',
  name: 'Club Hoodie',
  brand_style: 'Gildan SF500',
  description: null,
  image_url: null,
  blank_cost_cents: 1250,
  colors: [{ name: 'Black', hex: '#000000' }],
  sizes: ['Adult M', 'Adult L'],
  is_visible: true,
  credit_eligible: false,
  sort_order: 0,
  created_at: new Date(),
  updated_at: new Date(),
};

const decorationRow = {
  id: 'dec-1',
  product_id: 'prod-1',
  decoration_type: 'back_name',
  label: 'Name on Back',
  placement_options: [],
  price_cents: 500,
  requires_text: true,
  sort_order: 0,
};

function qResult(rows: any[]) {
  return { rows, command: 'SELECT', rowCount: rows.length, oid: 0, fields: [] } as any;
}

describe('CatalogRepository', () => {
  let repo: CatalogRepository;

  beforeEach(() => {
    repo = new CatalogRepository();
    jest.clearAllMocks();
  });

  describe('findProducts', () => {
    it('filters to visible products and attaches their decorations', async () => {
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow])) // products
        .mockResolvedValueOnce(qResult([decorationRow])); // decorations

      const products = await repo.findProducts(true);

      const [productsSql] = mockDb.query.mock.calls[0];
      expect(productsSql).toContain('WHERE is_visible = TRUE');
      expect(products).toHaveLength(1);
      expect(products[0].decorations).toHaveLength(1);
      expect(products[0].decorations[0].decoration_type).toBe('back_name');
    });

    it('omits the visibility filter for admin (visibleOnly=false)', async () => {
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([]));

      await repo.findProducts(false);

      const [productsSql] = mockDb.query.mock.calls[0];
      expect(productsSql).not.toContain('WHERE is_visible');
    });

    it('returns [] and skips the decorations query when there are no products', async () => {
      mockDb.query.mockResolvedValueOnce(qResult([]));
      const products = await repo.findProducts(true);
      expect(products).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('returns the product with its decorations', async () => {
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([decorationRow]));
      const product = await repo.findById('prod-1');
      expect(product?.id).toBe('prod-1');
      expect(product?.decorations).toHaveLength(1);
    });

    it('returns null when not found', async () => {
      mockDb.query.mockResolvedValueOnce(qResult([]));
      expect(await repo.findById('nope')).toBeNull();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('inserts the product + decorations in a transaction and returns the created product', async () => {
      const client = { query: jest.fn().mockResolvedValue(qResult([{ id: 'prod-1' }])) };
      mockDb.transaction.mockImplementation(async (cb: any) => cb(client));
      // findById after create
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([decorationRow]));

      const created = await repo.create({
        itemType: 'Hoodie',
        name: 'Club Hoodie',
        decorations: [{ decorationType: 'back_name', label: 'Name on Back', requiresText: true }],
      });

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      // 1 product insert + 1 decoration insert
      expect(client.query).toHaveBeenCalledTimes(2);
      const insertSql = client.query.mock.calls[0][0];
      expect(insertSql).toContain('INSERT INTO catalog_products');
      expect(created.id).toBe('prod-1');
    });
  });

  describe('update', () => {
    it('returns null when the product does not exist', async () => {
      mockDb.query.mockResolvedValueOnce(qResult([])); // findById → null
      const result = await repo.update('nope', { name: 'x' });
      expect(result).toBeNull();
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('replaces decorations when the decorations field is provided', async () => {
      // initial findById (exists)
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([decorationRow]));
      const client = { query: jest.fn().mockResolvedValue(qResult([])) };
      mockDb.transaction.mockImplementation(async (cb: any) => cb(client));
      // final findById
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([]));

      await repo.update('prod-1', { decorations: [] });

      const deleteCalled = client.query.mock.calls.some((c: any[]) =>
        /DELETE FROM catalog_decorations/.test(c[0])
      );
      expect(deleteCalled).toBe(true);
    });

    it('does not touch decorations when the field is omitted', async () => {
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([decorationRow]));
      const client = { query: jest.fn().mockResolvedValue(qResult([])) };
      mockDb.transaction.mockImplementation(async (cb: any) => cb(client));
      mockDb.query
        .mockResolvedValueOnce(qResult([productRow]))
        .mockResolvedValueOnce(qResult([decorationRow]));

      await repo.update('prod-1', { name: 'Renamed' });

      const deleteCalled = client.query.mock.calls.some((c: any[]) =>
        /DELETE FROM catalog_decorations/.test(c[0])
      );
      expect(deleteCalled).toBe(false);
      const updateCalled = client.query.mock.calls.some((c: any[]) =>
        /UPDATE catalog_products/.test(c[0])
      );
      expect(updateCalled).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns true when a row was removed', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] } as any);
      expect(await repo.delete('prod-1')).toBe(true);
    });

    it('returns false when nothing matched', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] } as any);
      expect(await repo.delete('prod-1')).toBe(false);
    });
  });
});
