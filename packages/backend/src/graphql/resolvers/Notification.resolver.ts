import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import { GroupedNotificationGQL, NotificationCountGQL } from '../types/Notification.type';
import { NotificationRepository, NotificationRow } from '../../repositories/notification.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Context } from '../context';
import { GraphQLError } from 'graphql';

@Resolver()
export class NotificationResolver {
  private notifRepo: NotificationRepository;
  private userRepo: UserRepository;

  constructor() {
    this.notifRepo = new NotificationRepository();
    this.userRepo = new UserRepository();
  }

  private async requireAuth(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  }

  private groupNotifications(rows: NotificationRow[]): GroupedNotificationGQL[] {
    // Group by (type, related_post_id) for comment/reaction,
    // group all NEW_POST together, group all NEW_MEMBER together,
    // keep NEW_EVENT individual per event
    const groups = new Map<string, NotificationRow[]>();

    for (const row of rows) {
      let key: string;
      if (row.type === 'NEW_COMMENT' || row.type === 'NEW_REACTION') {
        key = `${row.type}:${row.related_post_id || 'none'}`;
      } else if (row.type === 'NEW_POST') {
        key = 'NEW_POST:all';
      } else if (row.type === 'NEW_MEMBER') {
        key = 'NEW_MEMBER:all';
      } else if (row.type === 'NEW_EVENT') {
        key = `NEW_EVENT:${row.related_event_id || row.id}`;
      } else {
        key = `${row.type}:${row.id}`;
      }

      const existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    }

    const result: GroupedNotificationGQL[] = [];

    for (const [, groupRows] of groups) {
      const first = groupRows[0];
      const count = groupRows.length;

      // Collect unique actor names
      const actorNames: string[] = [];
      const seenActors = new Set<string>();
      for (const r of groupRows) {
        if (r.actor_id && r.actor_first_name && !seenActors.has(r.actor_id)) {
          seenActors.add(r.actor_id);
          actorNames.push(`${r.actor_first_name} ${r.actor_last_name || ''}`.trim());
        }
      }

      // Generate display title
      const title = this.generateTitle(first.type, actorNames, count, first.title);

      // Is group read? Only if ALL in group are read
      const isRead = groupRows.every(r => r.is_read);

      result.push({
        type: first.type,
        title,
        body: first.body || undefined,
        relatedPostId: first.related_post_id || undefined,
        relatedEventId: first.related_event_id || undefined,
        relatedUserId: first.related_user_id || undefined,
        count,
        actorNames,
        latestAt: first.created_at, // rows are ordered by created_at DESC, so first is latest
        notificationIds: groupRows.map(r => r.id),
        isRead,
      });
    }

    return result;
  }

  private generateTitle(type: string, actorNames: string[], count: number, rawTitle: string): string {
    switch (type) {
      case 'NEW_COMMENT': {
        if (actorNames.length === 1) {
          return `${actorNames[0]} commented on your post`;
        }
        const othersCount = actorNames.length - 1;
        return `${actorNames[0]} and ${othersCount} other${othersCount > 1 ? 's' : ''} commented on your post`;
      }
      case 'NEW_REACTION': {
        if (actorNames.length === 1) {
          return `${actorNames[0]} liked your post`;
        }
        const othersCount = actorNames.length - 1;
        return `${actorNames[0]} and ${othersCount} other${othersCount > 1 ? 's' : ''} liked your post`;
      }
      case 'NEW_POST': {
        if (count === 1 && actorNames.length === 1) {
          return `${actorNames[0]} added a new post - read and respond!`;
        }
        return `${count} new post${count > 1 ? 's' : ''} added - read and respond!`;
      }
      case 'NEW_MEMBER': {
        if (count === 1 && actorNames.length === 1) {
          return `New member joined: ${actorNames[0]}! Post a Welcome for them in the feed!`;
        }
        return `${count} new member${count > 1 ? 's' : ''} joined! Post a Welcome for them in the feed!`;
      }
      case 'NEW_EVENT': {
        return rawTitle; // Already formatted as "Event Title - click here to RSVP"
      }
      default:
        return rawTitle;
    }
  }

  @Query(() => [GroupedNotificationGQL])
  async myNotifications(
    @Arg('limit', () => Int, { nullable: true, defaultValue: 50 }) limit: number,
    @Ctx() context: Context
  ): Promise<GroupedNotificationGQL[]> {
    const userId = await this.requireAuth(context);
    const rows = await this.notifRepo.findByUserId(userId, limit);
    return this.groupNotifications(rows);
  }

  @Query(() => NotificationCountGQL)
  async unreadNotificationCount(@Ctx() context: Context): Promise<NotificationCountGQL> {
    const userId = await this.requireAuth(context);
    const unreadCount = await this.notifRepo.countUnread(userId);
    return { unreadCount };
  }

  @Mutation(() => Boolean)
  async markNotificationsRead(
    @Arg('notificationIds', () => [String]) notificationIds: string[],
    @Ctx() context: Context
  ): Promise<boolean> {
    const userId = await this.requireAuth(context);
    await this.notifRepo.markAsRead(notificationIds, userId);
    return true;
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@Ctx() context: Context): Promise<boolean> {
    const userId = await this.requireAuth(context);
    await this.notifRepo.markAllAsRead(userId);
    return true;
  }
}
