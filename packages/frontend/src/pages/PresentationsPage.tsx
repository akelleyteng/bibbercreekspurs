import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Combobox } from '@headlessui/react';

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
  agendaDriveFileId?: string;
  agendaDriveFileName?: string;
  agendaDriveFileUrl?: string;
  createdAt: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  webViewLink?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
}

interface PickerMember {
  id: string;
  firstName: string;
  lastName: string;
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
    agendaDriveFileId agendaDriveFileName agendaDriveFileUrl
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

  // Manager access (admin, adult leader, or current-term officer)
  const [isManager, setIsManager] = useState(false);
  const [meetingsFolderId, setMeetingsFolderId] = useState<string | null>(null);

  // Modal state
  const [showReserveModal, setShowReserveModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<Reservation | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<Reservation | null>(null);
  const [showEnableModal, setShowEnableModal] = useState<CalendarEvent | null>(null);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState<PresentationMeeting | null>(null);
  const [showAgendaPickerForMeeting, setShowAgendaPickerForMeeting] = useState<PresentationMeeting | null>(null);
  const [showEmailAgendaModal, setShowEmailAgendaModal] = useState<PresentationMeeting | null>(null);

  // Upload state
  const [uploadingReservationId, setUploadingReservationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ reservationId: string; fileType: FileType } | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isYouth = user?.role === 'YOUTH_MEMBER';
  const canManage = isAdmin || isManager;

  // Youth members available for the reserve-on-behalf picker
  const [youthMembers, setYouthMembers] = useState<PickerMember[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const fetches: Promise<any>[] = [
        authFetch(MEETINGS_QUERY),
        authFetch(`query { events { id title startTime endTime location isAllDay } }`),
        authFetch(`query { presentationsFolderId }`),
        authFetch(`query { presentationsImagesFolderId }`),
        authFetch(`query { presentationsRecordingsFolderId }`),
        authFetch(`query { isCurrentUserPresentationManager }`),
        authFetch(`query { meetingsDriveFolderId }`),
      ];

      // Fetch youth members for the reserve-on-behalf picker (non-youth only)
      const needsMemberPicker = user && user.role !== 'YOUTH_MEMBER';
      if (needsMemberPicker) {
        fetches.push(
          authFetch(`query { users { id firstName lastName role linkedChildren { id firstName lastName } } }`)
        );
      }

      const results = await Promise.all(fetches);
      const [meetingsRes, eventsRes, folderRes, imgFolderRes, recFolderRes] = results;

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
      if (results[5]?.data?.isCurrentUserPresentationManager != null) {
        setIsManager(results[5].data.isCurrentUserPresentationManager);
      }
      if (results[6]?.data?.meetingsDriveFolderId) {
        setMeetingsFolderId(results[6].data.meetingsDriveFolderId);
      }

      // Process youth members for picker
      if (needsMemberPicker && results[7]?.data?.users) {
        const allUsers = results[7].data.users as Array<{
          id: string; firstName: string; lastName: string; role: string;
          linkedChildren?: Array<{ id: string; firstName: string; lastName: string }>;
        }>;

        if (user.role === 'ADMIN') {
          // Admin: show all youth members
          setYouthMembers(
            allUsers
              .filter((u) => u.role === 'YOUTH_MEMBER')
              .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }))
          );
        } else {
          // Parent / Adult Leader: show linked children
          const me = allUsers.find((u) => u.id === user.id);
          setYouthMembers(
            (me?.linkedChildren || []).map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }))
          );
        }
      }
    } catch {
      setError('Failed to load presentations data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enableableEvents = calendarEvents.filter(
    (e) => !meetings.some((m) => m.googleEventId === e.id)
  );

  // ── Actions ──

  const handleReserve = async (meetingId: string, title: string, description: string, userId?: string) => {
    setError(null);
    const input: Record<string, any> = { meetingId, title, description: description || undefined };
    if (userId && userId !== user?.id) {
      input.userId = userId;
    }
    const res = await authFetch(
      `mutation($input: ReservePresentationInput!) { reservePresentation(input: $input) { id } }`,
      { input }
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

  // ── Agenda actions ──

  const handleLinkAgenda = async (meetingId: string, file: DriveFile) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: UpdatePresentationMeetingInput!) { updatePresentationMeeting(input: $input) { id } }`,
      { input: { id: meetingId, agendaDriveFileId: file.id, agendaDriveFileName: file.name, agendaDriveFileUrl: file.webViewLink || '' } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowAgendaPickerForMeeting(null);
    fetchData();
  };

  const handleUnlinkAgenda = async (meetingId: string) => {
    if (!confirm('Remove the linked agenda from this meeting?')) return;
    setError(null);
    const res = await authFetch(
      `mutation($input: UpdatePresentationMeetingInput!) { updatePresentationMeeting(input: $input) { id } }`,
      { input: { id: meetingId, agendaDriveFileId: '', agendaDriveFileName: '', agendaDriveFileUrl: '' } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    fetchData();
  };

  const handleEmailAgenda = async (meetingId: string, message: string) => {
    setError(null);
    const res = await authFetch(
      `mutation($input: EmailAgendaInput!) { emailAgenda(input: $input) }`,
      { input: { meetingId, message } }
    );
    if (res.errors) { setError(res.errors[0].message); return; }
    setShowEmailAgendaModal(null);
    alert('Agenda email sent to all club members!');
  };

  // ── Render ──

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Club Meetings</h1>
        <p className="text-gray-500 text-center py-12">Loading meetings...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Club Meeting Agenda &amp; Presentation Signups</h1>
      <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
        View meeting agendas, sign up to present, and upload your slides, photos, and recordings.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Manager: Enable presentations on a meeting */}
      {canManage && enableableEvents.length > 0 && (
        <AdminEnableSection
          enableableEvents={enableableEvents}
          onEnable={(event) => setShowEnableModal(event)}
          isAdmin={isAdmin}
        />
      )}

      {/* Meetings with presentation slots */}
      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No meetings with presentation slots yet.</p>
          {canManage && (
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
              canManage={canManage}
              uploadingReservationId={uploadingReservationId}
              onReserve={() => setShowReserveModal(meeting.id)}
              onEdit={(r) => setShowEditModal(r)}
              onDelete={handleDelete}
              onMove={(r) => setShowMoveModal(r)}
              onUpload={handleUploadClick}
              onRemoveFile={handleRemoveFile}
              onEditMeeting={() => setShowEditMeetingModal(meeting)}
              onDisable={() => handleDisablePresentations(meeting.id)}
              onLinkAgenda={() => setShowAgendaPickerForMeeting(meeting)}
              onUnlinkAgenda={() => handleUnlinkAgenda(meeting.id)}
              onEmailAgenda={() => setShowEmailAgendaModal(meeting)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showReserveModal && (
        <ReserveModal
          onClose={() => setShowReserveModal(null)}
          onSubmit={(title, desc, userId) => handleReserve(showReserveModal, title, desc, userId)}
          isYouth={isYouth}
          isAdmin={isAdmin}
          youthMembers={youthMembers}
          currentUser={user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : undefined}
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
      {showAgendaPickerForMeeting && meetingsFolderId && (
        <AgendaPickerModal
          meetingsFolderId={meetingsFolderId}
          onClose={() => setShowAgendaPickerForMeeting(null)}
          onSelect={(file) => handleLinkAgenda(showAgendaPickerForMeeting.id, file)}
        />
      )}
      {showEmailAgendaModal && (
        <EmailAgendaModal
          meeting={showEmailAgendaModal}
          onClose={() => setShowEmailAgendaModal(null)}
          onSend={(message) => handleEmailAgenda(showEmailAgendaModal.id, message)}
        />
      )}
    </div>
  );
}

// ── Admin Enable Section ──

function AdminEnableSection({
  enableableEvents,
  onEnable,
  isAdmin,
}: {
  enableableEvents: CalendarEvent[];
  onEnable: (event: CalendarEvent) => void;
  isAdmin: boolean;
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
    <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-blue-600 text-lg">&#9881;</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{isAdmin ? 'Admin' : 'Manager'}</span>
        <h2 className="text-lg font-semibold text-blue-900">Enable Presentations on a Meeting</h2>
      </div>
      <p className="text-xs text-blue-500 italic mb-3">Only visible to managers</p>

      {/* Club Meeting events shown as buttons by default */}
      {clubMeetingEvents.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {clubMeetingEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEnable(event)}
              className="inline-flex items-center px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="mr-2 text-blue-700 font-medium">
                {format(parseEventDate(event.startTime), 'MMM d')}
              </span>
              <span className="text-gray-700 truncate max-w-[200px]">{event.title}</span>
              <span className="ml-2 text-blue-500">+</span>
            </button>
          ))}
        </div>
      )}

      {clubMeetingEvents.length === 0 && (
        <p className="text-sm text-blue-400 mb-3">No upcoming Club Meeting events found on the calendar.</p>
      )}

      {/* Other meetings via dropdown */}
      {otherEvents.length > 0 && (
        <div>
          {!showOtherDropdown ? (
            <button
              onClick={() => { setShowOtherDropdown(true); setSelectedOtherId(otherEvents[0].id); }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
  canManage,
  uploadingReservationId,
  onReserve,
  onEdit,
  onDelete,
  onMove,
  onUpload,
  onRemoveFile,
  onEditMeeting,
  onDisable,
  onLinkAgenda,
  onUnlinkAgenda,
  onEmailAgenda,
}: {
  meeting: PresentationMeeting;
  currentUserId?: string;
  canManage: boolean;
  uploadingReservationId: string | null;
  onReserve: () => void;
  onEdit: (r: Reservation) => void;
  onDelete: (id: string) => void;
  onMove: (r: Reservation) => void;
  onUpload: (reservationId: string, fileType: FileType) => void;
  onRemoveFile: (reservationId: string, fileId: string) => void;
  onEditMeeting: () => void;
  onDisable: () => void;
  onLinkAgenda: () => void;
  onUnlinkAgenda: () => void;
  onEmailAgenda: () => void;
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
            {canManage && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditMeeting(); }}
                  className="p-1 sm:p-1.5 text-blue-500 hover:text-blue-700 border border-blue-200 bg-blue-50 rounded"
                  title="Edit meeting settings"
                >&#9998;</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDisable(); }}
                  className="p-1 sm:p-1.5 text-blue-500 hover:text-red-500 border border-blue-200 bg-blue-50 rounded"
                  title="Disable presentations"
                >&#128465;</button>
              </>
            )}
            <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
          </div>
        </div>
      </div>

      {/* Agenda section */}
      {(meeting.agendaDriveFileId || canManage) && (
        <div className="border-t border-gray-100 px-4 sm:px-6 py-2 sm:py-3 bg-gray-50">
          {meeting.agendaDriveFileId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Agenda:</span>
              <a
                href={meeting.agendaDriveFileUrl || `https://drive.google.com/file/d/${meeting.agendaDriveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700 underline truncate max-w-[200px] sm:max-w-[300px]"
              >
                {meeting.agendaDriveFileName || 'View Agenda'}
              </a>
              {canManage && (
                <>
                  <button
                    onClick={onUnlinkAgenda}
                    className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded"
                  >Remove</button>
                  <button
                    onClick={onEmailAgenda}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded"
                  >Email Agenda</button>
                </>
              )}
            </div>
          ) : canManage ? (
            <button
              onClick={onLinkAgenda}
              className="text-sm text-blue-600 hover:text-blue-700 border border-blue-200 bg-blue-50 px-3 py-1 rounded font-medium"
            >
              + Link Agenda
            </button>
          ) : null}
        </div>
      )}

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
                const canAct = isOwn || canManage;
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
                                {canAct && (
                                  <button
                                    onClick={() => onRemoveFile(res.id, f.id)}
                                    className={`text-xs ml-1 flex-shrink-0 ${isOwn ? 'text-red-400 hover:text-red-600' : 'text-blue-400 hover:text-blue-600'}`}
                                    title="Remove file"
                                  >&times;</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions — below content on mobile, inline on desktop */}
                        {canAct && (
                          <div className="mt-2 sm:hidden">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                onClick={() => onEdit(res)}
                                className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-gray-300 hover:bg-gray-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                              >Edit</button>
                              <button
                                onClick={() => onMove(res)}
                                className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-gray-300 hover:bg-gray-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                              >Move</button>
                              <button
                                onClick={() => onDelete(res.id)}
                                className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-red-300 text-red-600 hover:bg-red-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
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

                      {/* Actions — right column on desktop only */}
                      {canAct && (
                        <div className="hidden sm:flex flex-shrink-0 flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEdit(res)}
                              className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-gray-300 hover:bg-gray-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                            >Edit</button>
                            <button
                              onClick={() => onMove(res)}
                              className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-gray-300 hover:bg-gray-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                            >Move</button>
                            <button
                              onClick={() => onDelete(res.id)}
                              className={`px-2 py-1 text-xs rounded ${isOwn ? 'bg-white border border-red-300 text-red-600 hover:bg-red-50' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
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

function ReserveModal({
  onClose,
  onSubmit,
  isYouth,
  isAdmin,
  youthMembers,
  currentUser,
}: {
  onClose: () => void;
  onSubmit: (title: string, desc: string, userId?: string) => void;
  isYouth: boolean;
  isAdmin: boolean;
  youthMembers: PickerMember[];
  currentUser?: PickerMember;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Member picker state
  const showPicker = !isYouth && (youthMembers.length > 0 || isAdmin);
  // Default: parent with exactly 1 child → auto-select; admin or multiple children → empty
  const defaultMember = !isAdmin && youthMembers.length === 1 ? youthMembers[0] : null;
  const [selectedMember, setSelectedMember] = useState<PickerMember | null>(defaultMember);
  const [comboQuery, setComboQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const allOptions = currentUser
      ? [currentUser, ...youthMembers.filter((m) => m.id !== currentUser.id)]
      : youthMembers;
    if (!comboQuery) return allOptions;
    const q = comboQuery.toLowerCase();
    return allOptions.filter(
      (m) => m.firstName.toLowerCase().includes(q) || m.lastName.toLowerCase().includes(q)
    );
  }, [comboQuery, youthMembers, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit(title.trim(), description.trim(), selectedMember?.id);
    setSubmitting(false);
  };

  return (
    <ModalWrapper title="Reserve a Presentation Spot" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member picker for non-youth users */}
        {showPicker && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who is presenting? <span className="text-red-500">*</span>
            </label>
            {isAdmin ? (
              /* Admin: searchable combobox — starts empty, dropdown on focus */
              <Combobox value={selectedMember} onChange={setSelectedMember} nullable>
                <div className="relative">
                  <Combobox.Input
                    className="input w-full pr-8"
                    displayValue={(m: PickerMember | null) =>
                      m ? `${m.firstName} ${m.lastName}` : ''
                    }
                    onChange={(e) => setComboQuery(e.target.value)}
                    placeholder="Type to search or click to browse members..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <span className="text-gray-400 text-xs">&#9660;</span>
                  </Combobox.Button>
                  <Combobox.Options className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white shadow-lg border border-gray-200 py-1 text-sm">
                    {filteredMembers.length === 0 ? (
                      <div className="px-3 py-2 text-gray-500">No members found</div>
                    ) : (
                      filteredMembers.map((m) => (
                        <Combobox.Option
                          key={m.id}
                          value={m}
                          className={({ active }) =>
                            `cursor-pointer px-3 py-2 ${active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'}`
                          }
                        >
                          {({ selected }) => (
                            <span className={selected ? 'font-semibold' : ''}>
                              {m.firstName} {m.lastName}
                              {m.id === currentUser?.id && (
                                <span className="ml-1 text-xs text-gray-400">(you)</span>
                              )}
                            </span>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
            ) : (
              /* Parent / Adult Leader: simple select */
              <select
                className="input w-full"
                value={selectedMember?.id || ''}
                onChange={(e) => {
                  const all = currentUser
                    ? [currentUser, ...youthMembers.filter((m) => m.id !== currentUser.id)]
                    : youthMembers;
                  setSelectedMember(all.find((m) => m.id === e.target.value) || null);
                }}
              >
                {currentUser && (
                  <option value={currentUser.id}>
                    {currentUser.firstName} {currentUser.lastName} (you)
                  </option>
                )}
                {youthMembers
                  .filter((m) => m.id !== currentUser?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}

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
            autoFocus={isYouth}
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
          <button
            type="submit"
            disabled={!title.trim() || submitting || (showPicker && !selectedMember)}
            className="btn-primary text-sm disabled:opacity-50"
          >
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

function AgendaPickerModal({
  meetingsFolderId,
  onClose,
  onSelect,
}: {
  meetingsFolderId: string;
  onClose: () => void;
  onSelect: (file: DriveFile) => void;
}) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([
    { id: meetingsFolderId, name: 'Meetings' },
  ]);

  const currentFolderId = folderStack[folderStack.length - 1].id;

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authFetch(
        `query DriveFiles($folderId: String!) {
          driveFiles(folderId: $folderId) {
            files { id name mimeType isFolder webViewLink }
          }
        }`,
        { folderId }
      );
      if (result.errors) {
        setError(result.errors[0]?.message || 'Failed to load files');
        return;
      }
      setFiles(result.data?.driveFiles?.files || []);
    } catch {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId, fetchFiles]);

  const navigateInto = (folder: DriveFile) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = (index: number) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
  };

  return (
    <ModalWrapper title="Link Agenda File" onClose={onClose}>
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-1 text-sm text-gray-500 mb-3">
        {folderStack.map((f, i) => (
          <span key={f.id} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <button
              onClick={() => navigateBack(i)}
              className={`hover:text-primary-600 ${i === folderStack.length - 1 ? 'font-medium text-gray-700' : ''}`}
            >
              {f.name}
            </button>
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-6">Loading files...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-6">{error}</p>
      ) : files.length === 0 ? (
        <p className="text-center text-gray-400 py-6">No files in this folder</p>
      ) : (
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => file.isFolder ? navigateInto(file) : onSelect(file)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <span>{file.isFolder ? '\u{1F4C1}' : '\u{1F4C4}'}</span>
              <span className="truncate flex-1">{file.name}</span>
              {file.isFolder && <span className="text-gray-400 text-xs">&rarr;</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
      </div>
    </ModalWrapper>
  );
}

function EmailAgendaModal({
  meeting,
  onClose,
  onSend,
}: {
  meeting: PresentationMeeting;
  onClose: () => void;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await onSend(message.trim());
    setSending(false);
  };

  return (
    <ModalWrapper title="Email Agenda to Members" onClose={onClose}>
      <div className="mb-4 text-sm text-gray-600">
        <p><strong>{meeting.eventTitle || 'Club Meeting'}</strong></p>
        {meeting.eventDate && (
          <p>{format(parseEventDate(meeting.eventDate), 'EEEE, MMMM d, yyyy')}</p>
        )}
        {meeting.agendaDriveFileName && (
          <p className="mt-1">Agenda: <span className="text-primary-600">{meeting.agendaDriveFileName}</span></p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input w-full"
            rows={4}
            placeholder="Add a note to include in the email..."
          />
        </div>
        <p className="text-xs text-gray-500">
          This will send an email to all approved club members with a link to the agenda.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            type="submit"
            disabled={sending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send to All Members'}
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
