import { useState, useEffect, useCallback } from 'react';
import {
  COMMUNICATION_EMAIL_TYPE_LABELS,
  CommunicationEmailType,
  RECIPIENT_GROUP_LABELS,
  RecipientGroup,
} from '@4hclub/shared';
import RichTextEditor from './RichTextEditor';
import { authFetch } from '../utils/authFetch';

const apiBaseUrl = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace('/graphql', '');

interface AttachmentMeta {
  type: 'link';
  filename: string;
  url: string;
  mimeType: string;
  fileSize: number;
}

interface CommunicationRecord {
  id: string;
  subject: string;
  body: string;
  emailType: string;
  recipientGroup: string;
  recipientCount: number;
  recipientEmails: string[];
  status: string;
  attachments: AttachmentMeta[];
  errorMessage?: string;
  sender: { id: string; firstName: string; lastName: string; email: string };
  sentAt?: string;
  createdAt: string;
}

const EMAIL_TYPE_OPTIONS = Object.entries(COMMUNICATION_EMAIL_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const RECIPIENT_OPTIONS = Object.entries(RECIPIENT_GROUP_LABELS).map(([value, label]) => ({ value, label }));

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusBadge(status: string) {
  switch (status) {
    case 'SENT':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Sent</span>;
    case 'FAILED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Failed</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
  }
}

export default function AdminCommunications() {
  const [view, setView] = useState<'log' | 'compose'>('log');
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedComm, setExpandedComm] = useState<CommunicationRecord | null>(null);

  // Compose form state
  const [recipientGroup, setRecipientGroup] = useState<string>(RecipientGroup.ALL_MEMBERS);
  const [emailType, setEmailType] = useState<string>(CommunicationEmailType.ANNOUNCEMENT);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLog = useCallback(async () => {
    const result = await authFetch(
      `query AdminCommunications($limit: Int, $offset: Int) {
        adminCommunications(limit: $limit, offset: $offset) {
          total
          items {
            id subject emailType recipientGroup recipientCount status
            sender { firstName lastName }
            sentAt createdAt
          }
        }
      }`,
      { limit: 50, offset: 0 },
    );
    if (result.data?.adminCommunications) {
      setCommunications(result.data.adminCommunications.items);
      setTotal(result.data.adminCommunications.total);
    }
  }, []);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const fetchDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedComm(null);
      return;
    }
    const result = await authFetch(
      `query AdminCommunication($id: String!) {
        adminCommunication(id: $id) {
          id subject body emailType recipientGroup recipientCount recipientEmails status
          attachments { type filename url mimeType fileSize }
          errorMessage
          sender { firstName lastName email }
          sentAt createdAt
        }
      }`,
      { id },
    );
    if (result.data?.adminCommunication) {
      setExpandedId(id);
      setExpandedComm(result.data.adminCommunication);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10 MB)', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/api/upload/email-attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Upload failed', 'error');
        return;
      }

      const data = await res.json();
      setAttachments(prev => [...prev, {
        type: 'link',
        filename: data.filename,
        url: data.url,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
      }]);
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      showToast('Subject is required', 'error');
      return;
    }
    if (!body.trim() || body === '<p></p>') {
      showToast('Email body is required', 'error');
      return;
    }

    const groupLabel = RECIPIENT_GROUP_LABELS[recipientGroup as RecipientGroup] || recipientGroup;
    if (!confirm(`Send this email to ${groupLabel}? This action cannot be undone.`)) return;

    setSending(true);
    try {
      const result = await authFetch(
        `mutation SendCommunication($subject: String!, $body: String!, $emailType: String!, $recipientGroup: String!, $attachmentsJson: String) {
          sendCommunication(subject: $subject, body: $body, emailType: $emailType, recipientGroup: $recipientGroup, attachmentsJson: $attachmentsJson) {
            id status recipientCount errorMessage
          }
        }`,
        {
          subject,
          body,
          emailType,
          recipientGroup,
          attachmentsJson: attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
      );

      if (result.errors) {
        showToast(result.errors[0]?.message || 'Failed to send', 'error');
        return;
      }

      const comm = result.data?.sendCommunication;
      if (comm?.status === 'FAILED') {
        showToast(`Email failed: ${comm.errorMessage || 'Unknown error'}`, 'error');
      } else {
        showToast(`Email sent to ${comm?.recipientCount || 0} recipients!`);
        setSubject('');
        setBody('');
        setAttachments([]);
        setView('log');
        fetchLog();
      }
    } catch {
      showToast('Failed to send email', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Communications</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setView('log')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'log' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Email Log
          </button>
          <button
            onClick={() => setView('compose')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'compose' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Send Email
          </button>
        </div>
      </div>

      {/* Email Log View */}
      {view === 'log' && (
        <div>
          {communications.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No emails have been sent yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">{total} email{total !== 1 ? 's' : ''} sent</p>
              {communications.map((comm) => (
                <div key={comm.id}>
                  <div
                    onClick={() => fetchDetail(comm.id)}
                    className="card cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">{comm.subject}</h4>
                          {statusBadge(comm.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{COMMUNICATION_EMAIL_TYPE_LABELS[comm.emailType as CommunicationEmailType] || comm.emailType}</span>
                          <span>{RECIPIENT_GROUP_LABELS[comm.recipientGroup as RecipientGroup] || comm.recipientGroup} ({comm.recipientCount})</span>
                          <span>by {comm.sender.firstName} {comm.sender.lastName}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 ml-4 whitespace-nowrap">
                        {formatDate(comm.sentAt || comm.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {expandedId === comm.id && expandedComm && (
                    <div className="card mt-1 border-l-4 border-primary-400">
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Sent by:</span>{' '}
                          {expandedComm.sender.firstName} {expandedComm.sender.lastName} ({expandedComm.sender.email})
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Date:</span>{' '}
                          {formatDate(expandedComm.sentAt || expandedComm.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Type:</span>{' '}
                          {COMMUNICATION_EMAIL_TYPE_LABELS[expandedComm.emailType as CommunicationEmailType] || expandedComm.emailType}
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Recipients:</span>{' '}
                          {RECIPIENT_GROUP_LABELS[expandedComm.recipientGroup as RecipientGroup]} ({expandedComm.recipientCount})
                        </div>
                      </div>

                      {expandedComm.errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          <span className="font-medium">Error:</span> {expandedComm.errorMessage}
                        </div>
                      )}

                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Email Body:</span>
                        <div
                          className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border"
                          dangerouslySetInnerHTML={{ __html: expandedComm.body }}
                        />
                      </div>

                      {expandedComm.attachments.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-600 block mb-2">Attachments:</span>
                          <div className="flex flex-wrap gap-2">
                            {expandedComm.attachments.map((a, i) => (
                              <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100"
                              >
                                {a.filename}
                                {a.fileSize ? ` (${formatFileSize(a.fileSize)})` : ''}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <details className="text-sm">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          Recipient list ({expandedComm.recipientCount})
                        </summary>
                        <div className="mt-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg text-xs font-mono">
                          {expandedComm.recipientEmails.join(', ')}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compose View */}
      {view === 'compose' && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
              <select
                className="input"
                value={recipientGroup}
                onChange={(e) => setRecipientGroup(e.target.value)}
              >
                {RECIPIENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
              <select
                className="input"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
              >
                {EMAIL_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
              <span className={`ml-2 text-xs font-normal ${subject.length > 100 ? 'text-red-600' : 'text-gray-400'}`}>
                {subject.length}/100
              </span>
            </label>
            <input
              className="input"
              value={subject}
              onChange={(e) => {
                if (e.target.value.length <= 100) setSubject(e.target.value);
              }}
              placeholder="Email subject line..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your email content..."
              showHeadings={true}
            />
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700">{a.filename}</span>
                      <span className="text-gray-400">({formatFileSize(a.fileSize)})</span>
                    </div>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                className="hidden"
                onChange={handleUploadAttachment}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">Max 10 MB per file. Files are included as download links in the email.</p>
          </div>

          {/* Send Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim()}
              className={`btn-primary ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
            <button
              onClick={() => setView('log')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Emails are sent via BCC from admin@bibbercreekspurs4h.org. Recipients cannot see other addresses.
          </p>
        </div>
      )}
    </div>
  );
}
