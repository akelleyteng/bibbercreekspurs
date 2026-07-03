import { PresentationRepository } from '../../src/repositories/presentation.repository';
import db from '../../src/models/database';

// Mock the database module
jest.mock('../../src/models/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('PresentationRepository.updateMeeting - minutes columns', () => {
  let repo: PresentationRepository;
  const mockDb = db as jest.Mocked<typeof db>;
  const meetingId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    repo = new PresentationRepository();
    jest.clearAllMocks();
    mockDb.query.mockResolvedValue({
      rows: [{ id: meetingId }],
      command: 'UPDATE',
      rowCount: 1,
      oid: 0,
      fields: [],
    } as any);
  });

  it('should set minutes columns when linking a minutes file', async () => {
    await repo.updateMeeting(meetingId, {
      minutesDriveFileId: 'file-abc',
      minutesDriveFileName: 'March Minutes',
      minutesDriveFileUrl: 'https://docs.google.com/document/d/file-abc/edit',
    });

    const [sql, values] = mockDb.query.mock.calls[0];
    expect(sql).toContain('minutes_drive_file_id =');
    expect(sql).toContain('minutes_drive_file_name =');
    expect(sql).toContain('minutes_drive_file_url =');
    expect(values).toEqual(
      expect.arrayContaining(['file-abc', 'March Minutes', 'https://docs.google.com/document/d/file-abc/edit', meetingId])
    );
  });

  it('should pass null to clear minutes columns when unlinking (empty strings)', async () => {
    await repo.updateMeeting(meetingId, {
      minutesDriveFileId: '',
      minutesDriveFileName: '',
      minutesDriveFileUrl: '',
    });

    const [, values] = mockDb.query.mock.calls[0];
    // Empty strings are coerced to null so the columns are cleared, not set to ''
    expect((values as any[]).slice(0, 3)).toEqual([null, null, null]);
  });

  it('should not touch minutes columns when only agenda fields are provided', async () => {
    await repo.updateMeeting(meetingId, {
      agendaDriveFileId: 'agenda-1',
      agendaDriveFileName: 'Agenda',
      agendaDriveFileUrl: 'https://example.com/agenda',
    });

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).not.toContain('minutes_drive_file_id');
  });
});
