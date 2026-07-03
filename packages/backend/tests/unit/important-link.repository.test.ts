import { ImportantLinkRepository } from '../../src/repositories/important-link.repository';
import db from '../../src/models/database';

jest.mock('../../src/models/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('ImportantLinkRepository - Unit Tests', () => {
  let repo: ImportantLinkRepository;
  const mockDb = db as jest.Mocked<typeof db>;
  const linkId = '123e4567-e89b-12d3-a456-426614174000';

  const row = {
    id: linkId,
    title: 'Colorado 4-H Rule Book',
    url: 'https://example.com/rulebook.pdf',
    category: '4-H Resources',
    description: null,
    order_index: 1,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    repo = new ImportantLinkRepository();
    jest.clearAllMocks();
  });

  describe('findActive', () => {
    it('should query only active links ordered by order_index', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [row], command: 'SELECT', rowCount: 1, oid: 0, fields: [] } as any);

      const links = await repo.findActive();

      const [sql] = mockDb.query.mock.calls[0];
      expect(sql).toContain('WHERE is_active = true');
      expect(sql).toContain('ORDER BY order_index');
      expect(links).toHaveLength(1);
      expect(links[0].title).toBe('Colorado 4-H Rule Book');
    });
  });

  describe('create', () => {
    it('should insert a link and coerce missing optional fields to null', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [row], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);

      await repo.create({ title: 'Fair Info', url: 'https://example.com/fair' });

      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO important_links');
      // category, description, order_index default to null when omitted
      expect(values).toEqual(['Fair Info', 'https://example.com/fair', null, null, null]);
    });
  });

  describe('update', () => {
    it('should only set provided fields and always bump updated_at', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [row], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] } as any);

      await repo.update(linkId, { title: 'Updated Title', is_active: false });

      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('title = $1');
      expect(sql).toContain('is_active = $2');
      expect(sql).toContain('updated_at = CURRENT_TIMESTAMP');
      expect(sql).not.toContain('url =');
      expect(values).toEqual(['Updated Title', false, linkId]);
    });

    it('should return the existing row without querying when no fields change', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [row], command: 'SELECT', rowCount: 1, oid: 0, fields: [] } as any);

      await repo.update(linkId, {});

      // Falls through to findById — a SELECT by id, not an UPDATE
      const [sql] = mockDb.query.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).not.toContain('UPDATE');
    });
  });

  describe('delete', () => {
    it('should return true when a row is removed', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], command: 'DELETE', rowCount: 1, oid: 0, fields: [] } as any);
      expect(await repo.delete(linkId)).toBe(true);
    });

    it('should return false when nothing matched', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], command: 'DELETE', rowCount: 0, oid: 0, fields: [] } as any);
      expect(await repo.delete(linkId)).toBe(false);
    });
  });
});
