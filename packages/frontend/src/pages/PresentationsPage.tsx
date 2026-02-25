import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';

import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { parseEventDate } from '../utils/dateUtils';

const apiBaseUrl = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace('/graphql', '');

// ── Types ──

interface ReservationUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
}

interface PresentationFile {
  id: string;
  driveFileId: string;
  driveFileName: string;
  driveFileUrl?: string;
  fileType: string; // 'presentation' | 'image' | 'recording'
  createdAt: string;
}

interface Reservation {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  files: PresentationFile[];
  user: ReservationUser;
  createdAt: string;
  updatedAt: string;
  googleEventId?: string;
}

interface PresentationMeeting {
  id: string;
  googleEventId: string;
  totalSlots: number;
  notes?: string;
  slotsRemaining: number;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  reservations: Reservation[];
  createdAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
}

type FileType = 'presentation' | 'image' | 'recording';

const FILE_TYPE_LABELS: Record<FileType, string> = {
  presentation: 'Presentation',
  image: 'Photo/Poster',
  recording: 'Recording',
};

const FILE_TYPE_ICONS: Record<FileType, string> = {
  presentation: '\u{1F4CA}', // chart
  image: '\u{1F5BC}', // frame
  recording: '\u{1F3A5}', // camera
};

// ── GraphQL helpers ──


const MEETINGS_QUERY = `query {
  presentationMeetings {
    id googleEventId totalSlots notes slotsRemaining
    eventTitle eventDate eventLocation createdAt
    reservations {
      id meetingId title description
      files { id driveFileId driveFileName driveFileUrl fileType createdAt }
      user { id firstName lastName profilePhotoUrl }
      createdAt updatedAt
    }
  }
}`;

// ── Component ──

export default function PresentationsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<PresentationMeeting[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presentationsFolderId, setPresentationsFolderId] = useState<string | null>(null);
  const [imagesFolderId, setImagesFolderId] = useState<string | null>(null);
  const [recordingsFolderId, setRecordingsFolderId] = useState<string | null>(null);

  // Modal state
  const [showReserveModal, setShowReserveModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<Reservation | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<Reservation | null>(null);
  const [showEnableModal, setShowEnableModal] = useState<CalendarEvent | null>(null);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState<PresentationMeeting | null>(null);

  // Upload state
  const [uploadingReservationId, setUploadingReservationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ reservationId: string; fileType: FileType } | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    try {
      const [meetingsRes, eventsRes, folderRes, imgFolderRes, recFolderRes] = await Promise.all([
        authFetch(MEETINGS_QUERY),
        authFetch(`query { events { id title startTime endTime location isAllDay } }`),
        authFetch(`query { presentationsFolderId }`),
        authFetch(`query { presentationsImagesFolderId }`),
        authFetch(`query { presentationsRecordingsFolderId }`),
      ]);

      if (meetingsRes.data?.presentationMeetings) {
        setMeetings(meetingsRes.data.presentationMeetings);
      }
      if (eventsRes.data?.events) {
        setCalendarEvents(eventsRes.data.events);
      }
      if (folderRes.data?.presentationsFolderId) {
        setPresentationsFolderId(folderRes.data.presentationsFolderId);
      }
      if (imgFolderRes.data?.presentationsImagesFolderId) {
        setImagesFolderId(imgFolderRes.data.presentationsImagesFolderId);
      }
      if (recFolderRes.data?.presentationsRecordingsFolderId) {
        setRecordingsFolderId(recFolderRes.data.presentationsRecordingsFolderId);
      }
    } catch {
      setError('Failed to load presentations data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enableableEvents = calendarEvents.filter(
    (e) => !meetings.some((m) => m.googleEventId === e.id)
  );

  // ── Actions ──

  const handleReserve = async (meetingId: string, title: string, description: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: ReservePresentationInput!) { reservePresentation(input: $input) { id } }`,
      { input: { meetingId, title, description: description || undefined } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowReserveModal(null);
    fetchData();
  };

  const handleUpdateReservation = async (id: string, title: string, description: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: UpdateReservationInput!) { updatePresentationReservation(input: $input) { id } }`,
      { input: { id, title, description: description || undefined } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowEditModal(null);
    fetchData();
  };

  const handleDelete = async (reservationId: string) => {
    if (!confirm('Delete this presentation reservation? Any uploaded files will also be removed.')) return;
    setError(null);
    const res = await authFetch(
      `mutation($id: String!) { deletePresentation(reservationId: $id) }`,
      { id: reservationId }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    fetchData();
  };

  const handleMove = async (reservationId: string, newMeetingId: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: MovePresentationInput!) { movePresentation(input: $input) { id } }`,
      { input: { reservationId, newMeetingId } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowMoveModal(null);
    fetchData();
  };

  const handleUploadClick = (reservationId: string, fileType: FileType) => {
    uploadTargetRef.current = { reservationId, fileType };
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    if (!file || !target) return;

    // Determine which folder to upload to based on file type
    let folderId: string | null = null;
    if (target.fileType === 'recording') {
      folderId = recordingsFolderId;
    } else if (target.fileType === 'image') {
      folderId = imagesFolderId;
    } else {
      folderId = presentationsFolderId;
    }
    if (!folderId) {
      setError(`No ${target.fileType} folder configured`);
      return;
    }

    setUploadingReservationId(target.reservationId);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderId);

      const uploadRes = await fetch(`${apiBaseUrl}/api/upload`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        setError(err.error || 'Upload failed');
        return;
      }

      const uploadedFile = await uploadRes.json();

      const linkRes = await authFetch(
        `mutation($input: AddPresentationFileInput!) { addPresentationFile(input: $input) { id } }`,
        {
          input: {
            reservationId: target.reservationId,
            driveFileId: uploadedFile.id,
            driveFileName: uploadedFile.name,
            driveFileUrl: uploadedFile.webViewLink || uploadedFile.webContentLink || '',
            fileType: target.fileType,
          },
        }
      );

      if (linkRes.errors) { setError(linkRes.errors[0].message); return; }
      fetchData();
    } catch {
      setError('File upload failed');
    } finally {
      setUploadingReservationId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async (reservationId: string, fileId: string) => {
    if (!confirm('Remove this file from the presentation?')) return;
    setError(null);
    const res = await authFetch(
      `mutation($rid: String!, $fid: String!) { removePresentationFile(reservationId: $rid, fileId: $fid) }`,
      { rid: reservationId, fid: fileId }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    fetchData();
  };

  // ── Admin actions ──

  const handleEnablePresentations = async (googleEventId: string, totalSlots: number, notes: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: EnablePresentationsInput!) { enablePresentations(input: $input) { id } }`,
      { input: { googleEventId, totalSlots, notes: notes || undefined } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowEnableModal(null);
    fetchData();
  };

  const handleUpdateMeeting = async (id: string, totalSlots: number, notes: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: UpdatePresentationMeetingInput!) { updatePresentationMeeting(input: $input) { id } }`,
      { input: { id, totalSlots, notes: notes || undefined } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowEditMeetingModal(null);
    fetchData();
  };

  const handleDisablePresentations = async (meetingId: string) => {
    if (!confirm('Disable presentations for this meeting? All reservations will be deleted.')) return;
    setError(null);
    const res = await authFetch(
      `mutation($id: String!) { disablePresentations(meetingId: $id) }`,
      { id: meetingId }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    fetchData();
  };

  // ── Render ──

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Presentations</h1>
        <p className="text-gray-500 text-center py-12">Loading presentations...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Presentations</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        Sign up to present at a club meeting. Reserve your spot, then upload your slides, photos, and recordings when ready.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Admin: Enable presentations on a meeting */}
      {isAdmin && enableableEvents.length > 0 && (
        <AdminEnableSection
          enableableEvents={enableableEvents}
          onEnable={(event) => setShowEnableModal(event)}
        />
      )}

      {/* Meetings with presentation slots */}
      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No meetings with presentation slots yet.</p>
          {isAdmin && (
            <p className="text-gray-400 mt-2">Use the buttons above to enable presentations on upcoming meetings.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              uploadingReservationId={uploadingReservationId}
              onReserve={() => setShowReserveModal(meeting.id)}
              onEdit={(r) => setShowEditModal(r)}
              onDelete={handleDelete}
              onMove={(r) => setShowMoveModal(r)}
              onUpload={handleUploadClick}
              onRemoveFile={handleRemoveFile}
              onEditMeeting={() => setShowEditMeetingModal(meeting)}
              onDisable={() => handleDisablePresentations(meeting.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showReserveModal && (
        <ReserveModal
          onClose={() => setShowReserveModal(null)}
          onSubmit={(title, desc) => handleReserve(showReserveModal, title, desc)}
        />
      )}
      {showEditModal && (
        <EditReservationModal
          reservation={showEditModal}
          onClose={() => setShowEditModal(null)}
          onSubmit={(title, desc) => handleUpdateReservation(showEditModal.id, title, desc)}
        />
      )}
      {showMoveModal && (
        <MoveModal
          reservation={showMoveModal}
          meetings={meetings}
          onClose={() => setShowMoveModal(null)}
          onSubmit={(newMeetingId) => handleMove(showMoveModal.id, newMeetingId)}
        />
      )}
      {showEnableModal && (
        <EnableModal
          event={showEnableModal}
          onClose={() => setShowEnableModal(null)}
          onSubmit={(slots, notes) => handleEnablePresentations(showEnableModal.id, slots, notes)}
        />
      )}
      {showEditMeetingModal && (
        <EditMeetingModal
          meeting={showEditMeetingModal}
          onClose={() => setShowEditMeetingModal(null)}
          onSubmit={(slots, notes) => handleUpdateMeeting(showEditMeetingModal.id, slots, notes)}
        />
      )}
    </div>
  );
}

// ── Admin Enable Section ──

function AdminEnableSection({
  enableableEvents,
  onEnable,
}: {
  enableableEvents: CalendarEvent[];
  onEnable: (event: CalendarEvent) => void;
}) {
  const [showOtherDropdown, setShowOtherDropdown] = useState(false);
  const [selectedOtherId, setSelectedOtherId] = useState('');

  const clubMeetingEvents = enableableEvents.filter(
    (e) => e.title.toLowerCase().includes('club meeting')
  );
  const otherEvents = enableableEvents.filter(
    (e) => !e.title.toLowerCase().includes('club meeting')
  );

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Enable Presentations on a Meeting</h2>

      {/* Club Meeting events shown as buttons by default */}
      {clubMeetingEvents.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {clubMeetingEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEnable(event)}
              className="inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="mr-2 text-primary-600 font-medium">
                {format(parseEventDate(event.startTime), 'MMM d')}
              </span>
              <span className="text-gray-700 truncate max-w-[200px]">{event.title}</span>
              <span className="ml-2 text-primary-500">+</span>
            </button>
          ))}
        </div>
      )}

      {clubMeetingEvents.length === 0 && (
        <p className="text-sm text-gray-500 mb-3">No upcoming Club Meeting events found on the calendar.</p>
      )}

      {/* Other meetings via dropdown */}
      {otherEvents.length > 0 && (
        <div>
          {!showOtherDropdown ? (
            <button
              onClick={() => { setShowOtherDropdown(true); setSelectedOtherId(otherEvents[0].id); }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add from another event...
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedOtherId}
                onChange={(e) => setSelectedOtherId(e.target.value)}
                className="input text-sm flex-1 min-w-0 max-w-md"
              >
                {otherEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {format(parseEventDate(event.startTime), 'MMM d')} — {event.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const event = otherEvents.find((e) => e.id === selectedOtherId);
                  if (event) onEnable(event);
                }}
                disabled={!selectedOtherId}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Enable
              </button>
              <button
                onClick={() => setShowOtherDropdown(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Meeting Card ──

function MeetingCard({
  meeting,
  currentUserId,
  isAdmin,
  uploadingReservationId,
  onReserve,
  onEdit,
  onDelete,
  onMove,
  onUpload,
  onRemoveFile,
  onEditMeeting,
  onDisable,
}: {
  meeting: PresentationMeeting;
  currentUserId?: string;
  isAdmin: boolean;
  uploadingReservationId: string | null;
  onReserve: () => void;
  onEdit: (r: Reservation) => void;
  onDelete: (id: string) => void;
  onMove: (r: Reservation) => void;
  onUpload: (reservationId: string, fileType: FileType) => void;
  onRemoveFile: (reservationId: string, fileId: string) => void;
  onEditMeeting: () => void;
  onDisable: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const dateLong = meeting.eventDate
    ? format(parseEventDate(meeting.eventDate), 'EEEE, MMMM d, yyyy')
    : 'Date TBD';
  const dateShort = meeting.eventDate
    ? format(parseEventDate(meeting.eventDate), 'EEE, MMM d')
    : 'TBD';
  const slotsUsed = meeting.totalSlots - meeting.slotsRemaining;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {meeting.eventTitle || 'Club Meeting'}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                meeting.slotsRemaining > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {meeting.slotsRemaining > 0
                  ? `${meeting.slotsRemaining} slot${meeting.slotsRemaining !== 1 ? 's' : ''} open`
                  : 'Full'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
              <span className="hidden sm:inline">{dateLong}</span>
              <span className="sm:hidden">{dateShort}</span>
              {meeting.eventLocation && <span>&#128205; {meeting.eventLocation}</span>}
              <span>{slotsUsed}/{meeting.totalSlots} reserved</span>
            </div>
            {meeting.notes && (
              <p className="text-sm text-gray-500 mt-1 italic">{meeting.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 ml-2 flex-shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditMeeting(); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  title="Edit meeting settings"
                >&#9998;</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDisable(); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Disable presentations"
                >&#128465;</button>
              </>
            )}
            <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          {meeting.reservations.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No presentations reserved yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {meeting.reservations.map((res, idx) => {
                const isOwn = res.user.id === currentUserId;
                const isUploading = uploadingReservationId === res.id;

                return (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg ${isOwn ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs sm:text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-gray-900 text-sm sm:text-base">{res.title}</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            &mdash; {res.user.firstName} {res.user.lastName}
                          </span>
                        </div>
                        {res.description && (
                          <p className="text-sm text-gray-600 mt-1">{res.description}</p>
                        )}

                        {/* Files list */}
                        {res.files.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {res.files.map((f) => (
                              <div key={f.id} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                                <span>{FILE_TYPE_ICONS[f.fileType as FileType] || '\u{1F4CE}'}</span>
                                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                                  {FILE_TYPE_LABELS[f.fileType as FileType] || f.fileType}
                                </span>
                                {f.driveFileUrl ? (
                                  <a
                                    href={f.driveFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 underline truncate"
                                  >
                                    {f.driveFileName}
                                  </a>
                                ) : (
                                  <span className="text-gray-600 truncate">{f.driveFileName}</span>
                                )}
                                {isOwn && (
                                  <button
                                    onClick={() => onRemoveFile(res.id, f.id)}
                                    className="text-red-400 hover:text-red-600 text-xs ml-1 flex-shrink-0"
                                    title="Remove file"
                                  >&times;</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Owner actions — below content on mobile, inline on desktop */}
                        {isOwn && (
                          <div className="mt-2 sm:hidden">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                onClick={() => onEdit(res)}
                                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                              >Edit</button>
                              <button
                                onClick={() => onMove(res)}
                                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                              >Move</button>
                              <button
                                onClick={() => onDelete(res.id)}
                                className="px-2 py-1 text-xs bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
                              >Delete</button>
                              {isUploading ? (
                                <span className="text-xs text-gray-500 ml-1">Uploading...</span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => onUpload(res.id, 'presentation')}
                                    className="px-2 py-1 text-xs bg-primary-50 border border-primary-200 text-primary-700 rounded hover:bg-primary-100"
                                  >+ Slides</button>
                                  <button
                                    onClick={() => onUpload(res.id, 'image')}
                                    className="px-2 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100"
                                  >+ Photo</button>
                                  <button
                                    onClick={() => onUpload(res.id, 'recording')}
                                    className="px-2 py-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100"
                                  >+ Recording</button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Owner actions — right column on desktop only */}
                      {isOwn && (
                        <div className="hidden sm:flex flex-shrink-0 flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEdit(res)}
                              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >Edit</button>
                            <button
                              onClick={() => onMove(res)}
                              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >Move</button>
                            <button
                              onClick={() => onDelete(res.id)}
                              className="px-2 py-1 text-xs bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >Delete</button>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {isUploading ? (
                              <span className="text-xs text-gray-500">Uploading...</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => onUpload(res.id, 'presentation')}
                                  className="px-2 py-1 text-xs bg-primary-50 border border-primary-200 text-primary-700 rounded hover:bg-primary-100"
                                  title="Upload presentation file"
                                >+ Slides</button>
                                <button
                                  onClick={() => onUpload(res.id, 'image')}
                                  className="px-2 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100"
                                  title="Upload photo or poster board image"
                                >+ Photo</button>
                                <button
                                  onClick={() => onUpload(res.id, 'recording')}
                                  className="px-2 py-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100"
                                  title="Upload recording of presentation"
                                >+ Recording</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meeting.slotsRemaining > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button onClick={onReserve} className="btn-primary text-sm w-full sm:w-auto">
                Reserve a Presentation Spot
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modals ──

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReserveModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, desc: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit(title.trim(), description.trim());
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Reserve a Presentation Spot" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Presentation Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="input w-full"
            placeholder="e.g., Horse Grooming Basics"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full"
            rows={3}
            placeholder="Brief description of your presentation..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={!title.trim() || submitting} className="btn-primary text-sm disabled:opacity-50">
            {submitting ? 'Reserving...' : 'Reserve Spot'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditReservationModal({ reservation, onClose, onSubmit }: { reservation: Reservation; onClose: () => void; onSubmit: (title: string, desc: string) => void }) {
  const [title, setTitle] = useState(reservation.title);
  const [description, setDescription] = useState(reservation.description || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit(title.trim(), description.trim());
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Edit Presentation" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Presentation Title <span className="text-red-500">*</span>
          </label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="input w-full" required autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" rows={3} />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={!title.trim() || submitting} className="btn-primary text-sm disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function MoveModal({ reservation, meetings, onClose, onSubmit }: { reservation: Reservation; meetings: PresentationMeeting[]; onClose: () => void; onSubmit: (newMeetingId: string) => void }) {
  const availableMeetings = meetings.filter((m) => m.id !== reservation.meetingId && m.slotsRemaining > 0);
  const [selectedId, setSelectedId] = useState(availableMeetings[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    await onSubmit(selectedId);
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Move Presentation" onClose={onClose}>
      {availableMeetings.length === 0 ? (
        <div>
          <p className="text-gray-500 text-center py-4">No other meetings with available slots.</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Move &ldquo;{reservation.title}&rdquo; to:
            </label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input w-full">
              {availableMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.eventTitle || 'Club Meeting'} — {m.eventDate ? format(parseEventDate(m.eventDate), 'MMM d, yyyy') : 'TBD'} ({m.slotsRemaining} slots left)
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
              {submitting ? 'Moving...' : 'Move Presentation'}
            </button>
          </div>
        </form>
      )}
    </ModalWrapper>
  );
}

function EnableModal({ event, onClose, onSubmit }: { event: CalendarEvent; onClose: () => void; onSubmit: (totalSlots: number, notes: string) => void }) {
  const [slots, setSlots] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(slots, notes.trim());
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Enable Presentations" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-4">
        <strong>{event.title}</strong> &mdash; {format(parseEventDate(event.startTime), 'MMMM d, yyyy')}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Presentation Slots</label>
          <input type="number" value={slots} onChange={(e) => setSlots(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="input w-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="e.g., Short presentations only (5 min each)" />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
            {submitting ? 'Enabling...' : 'Enable Presentations'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditMeetingModal({ meeting, onClose, onSubmit }: { meeting: PresentationMeeting; onClose: () => void; onSubmit: (totalSlots: number, notes: string) => void }) {
  const [slots, setSlots] = useState(meeting.totalSlots);
  const [notes, setNotes] = useState(meeting.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(slots, notes.trim());
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Edit Meeting Presentations" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Presentation Slots</label>
          <input type="number" value={slots} onChange={(e) => setSlots(Math.max(1, parseInt(e.target.value) || 1))} min={1} className="input w-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary text-sm disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
