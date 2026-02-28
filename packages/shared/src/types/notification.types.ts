export enum NotificationType {
  NEW_EVENT = 'NEW_EVENT',
  NEW_BLOG_POST = 'NEW_BLOG_POST',
  NEW_POST = 'NEW_POST',
  NEW_COMMENT = 'NEW_COMMENT',
  NEW_REACTION = 'NEW_REACTION',
  NEW_MEMBER = 'NEW_MEMBER',
  EVENT_REMINDER = 'EVENT_REMINDER',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId?: string;
  title: string;
  body?: string;
  relatedPostId?: string;
  relatedEventId?: string;
  relatedUserId?: string;
  isRead: boolean;
  createdAt: Date;
}

export interface GroupedNotification {
  type: NotificationType;
  title: string;
  body?: string;
  relatedPostId?: string;
  relatedEventId?: string;
  relatedUserId?: string;
  count: number;
  actorNames: string[];
  latestAt: Date;
  notificationIds: string[];
  isRead: boolean;
}
