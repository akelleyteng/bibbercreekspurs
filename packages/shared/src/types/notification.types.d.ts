export declare enum NotificationType {
    NEW_EVENT = "NEW_EVENT",
    NEW_BLOG_POST = "NEW_BLOG_POST",
    NEW_POST = "NEW_POST",
    NEW_COMMENT = "NEW_COMMENT",
    NEW_REACTION = "NEW_REACTION",
    EVENT_REMINDER = "EVENT_REMINDER",
    ROLE_CHANGED = "ROLE_CHANGED"
}
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    content?: string;
    relatedPostId?: string;
    relatedEventId?: string;
    relatedBlogId?: string;
    isRead: boolean;
    createdAt: Date;
}
export interface NotificationWithDetails extends Notification {
    relatedPost?: {
        id: string;
        content: string;
        authorName: string;
    };
    relatedEvent?: {
        id: string;
        title: string;
    };
    relatedBlog?: {
        id: string;
        title: string;
    };
}
//# sourceMappingURL=notification.types.d.ts.map