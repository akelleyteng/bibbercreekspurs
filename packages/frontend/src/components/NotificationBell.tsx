import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
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

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<GroupedNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await authFetch(`query { unreadNotificationCount { unreadCount } }`);
      if (result.data?.unreadNotificationCount) {
        setUnreadCount(result.data.unreadNotificationCount.unreadCount);
      }
    } catch {
      // Silently fail — polling will retry
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authFetch(`query {
        myNotifications(limit: 20) {
          type title body relatedPostId relatedEventId relatedUserId
          count actorNames latestAt notificationIds isRead
        }
      }`);
      if (result.data?.myNotifications) {
        setNotifications(result.data.myNotifications);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: GroupedNotification) => {
    // Mark as read
    if (!notif.isRead) {
      await authFetch(
        `mutation MarkRead($ids: [String!]!) { markNotificationsRead(notificationIds: $ids) }`,
        { ids: notif.notificationIds }
      );
      fetchUnreadCount();
    }

    setIsOpen(false);

    // Navigate based on type
    if (notif.type === 'NEW_COMMENT' || notif.type === 'NEW_REACTION') {
      navigate(notif.relatedPostId ? `/feed?post=${notif.relatedPostId}` : '/feed');
    } else if (notif.type === 'NEW_POST') {
      navigate('/feed');
    } else if (notif.type === 'NEW_EVENT') {
      navigate(notif.relatedEventId ? `/events/${notif.relatedEventId}` : '/events');
    } else if (notif.type === 'NEW_MEMBER') {
      navigate('/feed');
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    await authFetch(`mutation { markAllNotificationsRead }`);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-primary-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif, index) => (
                <button
                  key={notif.notificationIds[0] || index}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    !notif.isRead ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
                      {typeIcons[notif.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDistanceToNow(new Date(notif.latestAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2" aria-label="Unread" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="block w-full text-center px-4 py-2.5 text-sm text-primary-600 hover:bg-gray-50 font-medium"
              >
                See all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
