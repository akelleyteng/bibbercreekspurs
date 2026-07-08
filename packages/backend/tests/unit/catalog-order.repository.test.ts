import { CatalogOrderRepository } from '../../src/repositories/catalog-order.repository';
import db from '../../src/models/database';

jest.mock('../../src/models/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), transaction: jest.fn() },
}));

const mockDb = db as jest.Mocked<typeof db>;

const orderRow = {
  id: 'o1',
  confirmation_code: 'BCS-ABC234',
  user_id: 'u1',
  buyer_name: 'Jane Doe',
  buyer_email: 'jane@example.com',
  status: 'PENDING',
  payment_status: 'UNPAID',
  payment_method: 'at_pickup',
  subtotal_cents: 5000,
  notes: null,
  batch_id: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const itemRow = {
  id: 'i1',
  order_id: 'o1',
  product_id: 'p1',
  product_name: 'Club Tee',
  item_type: 'Tee',
  color: 'Black',
  size: 'M',
  decorations: [],
  unit_price_cents: 2500,
  quantity: 2,
  created_at: new Date(),
};

const q = (rows: any[]) => ({ rows, rowCount: rows.length, command: '', oid: 0, fields: [] } as any);

describe('CatalogOrderRepository', () => {
  let repo: CatalogOrderRepository;

  beforeEach(() => {
    repo = new CatalogOrderRepository();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('generates a BCS- code, stores the computed subtotal, and inserts one row per line', async () => {
      const client = { query: jest.fn().mockResolvedValue(q([{ id: 'o1' }])) };
      mockDb.query
        .mockResolvedValueOnce(q([])) // uniqueCode: code is free
        .mockResolvedValueOnce(q([orderRow])) // findById: order
        .mockResolvedValueOnce(q([itemRow])); // findById: items
      mockDb.transaction.mockImplementation(async (cb: any) => cb(client));

      const order = await repo.createOrder({
        userId: 'u1',
        buyerName: 'Jane Doe',
        buyerEmail: 'jane@example.com',
        items: [
          { productName: 'Club Tee', itemType: 'Tee', color: 'Black', size: 'M', decorations: [], unitPriceCents: 2500, quantity: 2 },
        ],
      });

      // order insert + one item insert
      expect(client.query).toHaveBeenCalledTimes(2);
      const [orderSql, orderValues] = client.query.mock.calls[0];
      expect(orderSql).toContain('INSERT INTO catalog_orders');
      expect(orderValues[0]).toMatch(/^BCS-/); // confirmation code
      expect(orderValues[4]).toBe(5000); // subtotal = 2500 * 2

      const [itemSql] = client.query.mock.calls[1];
      expect(itemSql).toContain('INSERT INTO catalog_order_items');

      expect(order.items).toHaveLength(1);
      expect(order.confirmation_code).toBe('BCS-ABC234');
    });
  });

  describe('updateStatus', () => {
    it('updates only the provided fields and bumps updated_at', async () => {
      mockDb.query
        .mockResolvedValueOnce(q([{ ...orderRow, status: 'SUBMITTED' }])) // UPDATE ... RETURNING
        .mockResolvedValueOnce(q([itemRow])); // attachItems
      await repo.updateStatus('o1', { status: 'SUBMITTED' });

      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('status = $1');
      expect(sql).toContain('updated_at = CURRENT_TIMESTAMP');
      expect(sql).not.toContain('payment_status =');
      expect(values).toEqual(['SUBMITTED', 'o1']);
    });

    it('can update payment status', async () => {
      mockDb.query
        .mockResolvedValueOnce(q([{ ...orderRow, payment_status: 'PAID' }]))
        .mockResolvedValueOnce(q([itemRow]));
      await repo.updateStatus('o1', { paymentStatus: 'PAID' });

      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('payment_status = $1');
      expect(values).toEqual(['PAID', 'o1']);
    });

    it('returns null when the order does not exist', async () => {
      mockDb.query.mockResolvedValueOnce(q([]));
      expect(await repo.updateStatus('nope', { status: 'RECEIVED' })).toBeNull();
    });
  });

  describe('findByConfirmationCode', () => {
    it('returns the order with items', async () => {
      mockDb.query.mockResolvedValueOnce(q([orderRow])).mockResolvedValueOnce(q([itemRow]));
      const order = await repo.findByConfirmationCode('BCS-ABC234');
      expect(order?.confirmation_code).toBe('BCS-ABC234');
      expect(order?.items).toHaveLength(1);
    });

    it('returns null when not found (and does not query items)', async () => {
      mockDb.query.mockResolvedValueOnce(q([]));
      const order = await repo.findByConfirmationCode('BCS-NOPE12');
      expect(order).toBeNull();
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });
});
