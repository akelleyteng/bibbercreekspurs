import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { authFetch } from '../utils/authFetch';

interface GroupedNotification {
  type: string;
  title: string;
  body?: string;
  relatedPostId?: string;
  relatedEventId?: string;
  relatedUserId?: string;
  count: number;
  actorNames: string[];
  latestAt: string;
  notificationIds: string[];
  isRead: boolean;
}

const typeIcons: Record<string, string> = {
  NEW_COMMENT: '💬',
  NEW_REACTION: '❤️',
  NEW_POST: '📝',
  NEW_EVENT: '📅',
  NEW_MEMBER: '👋',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<GroupedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await authFetch(`query {
        myNotifications(limit: 100) {
          type title body relatedPostId relatedEventId relatedUserId
          count actorNames latestAt notificationIds isRead
        }
      }`);
      if (result.data?.myNotifications) {
        setNotifications(result.data.myNotifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif: GroupedNotification) => {
    if (!notif.isRead) {
      await authFetch(
        `mutation MarkRead($ids: [String!]!) { markNotificationsRead(notificationIds: $ids) }`,
        { ids: notif.notificationIds }
      );
    }

    if (notif.type === 'NEW_COMMENT' || notif.type === 'NEW_REACTION') {
      navigate(notif.relatedPostId ? `/feed?post=${notif.relatedPostId}` : '/feed');
    } else if (notif.type === 'NEW_POST') {
      navigate('/feed');
    } else if (notif.type === 'NEW_EVENT') {
      navigate(notif.relatedEventId ? `/events/${notif.relatedEventId}` : '/events');
    } else if (notif.type === 'NEW_MEMBER') {
      navigate('/feed');
    }
  };

  const handleMarkAllRead = async () => {
    await authFetch(`mutation { markAllNotificationsRead }`);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Notifications</h1>
        <div className="text-center py-12 text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-sm"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">No notifications yet</p>
          <p className="text-gray-400 text-sm mt-2">
            You'll see notifications here when someone interacts with your posts, new events are added, and more.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, index) => (
            <button
              key={notif.notificationIds[0] || index}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full text-left card hover:shadow-md transition-shadow cursor-pointer ${
                !notif.isRead ? 'ring-1 ring-primary-200 bg-primary-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">
                  {typeIcons[notif.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notif.body}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    {formatDistanceToNow(new Date(notif.latestAt), { addSuffix: true })}
                    {notif.count > 1 && ` · ${notif.count} notifications`}
                  </p>
                </div>
                {!notif.isRead && (
                  <span className="flex-shrink-0 w-2.5 h-2.5 bg-primary-500 rounded-full mt-2" aria-label="Unread" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
