import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import { Communication, CommunicationListResult } from '../types/Communication.type';
import { CommunicationRepository } from '../../repositories/communication.repository';
import { UserRepository } from '../../repositories/user.repository';
import { OfficerPositionRepository } from '../../repositories/officer-position.repository';
import { emailService } from '../../services/email.service';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

@Resolver()
export class CommunicationResolver {
  private commRepo = new CommunicationRepository();
  private userRepo = new UserRepository();
  private officerRepo = new OfficerPositionRepository();

  private async requireAdmin(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const payload = verifyAccessToken(authHeader.substring(7));
    const user = await this.userRepo.findById(payload.userId);
    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }
    return payload.userId;
  }

  private getCurrentTermYear(): string {
    const now = new Date();
    const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  }

  private async getRecipientEmails(group: string): Promise<string[]> {
    const allUsers = await this.userRepo.findAll();
    const approvedActive = allUsers.filter(
      u => u.approval_status === 'APPROVED' && u.is_active !== false
    );

    switch (group) {
      case 'YOUTH_MEMBERS':
        return approvedActive.filter(u => u.role === Role.YOUTH_MEMBER).map(u => u.email);
      case 'ADULT_LEADERS':
        return approvedActive.filter(u => u.role === Role.ADULT_LEADER).map(u => u.email);
      case 'PARENTS':
        return approvedActive.filter(u => u.role === Role.PARENT).map(u => u.email);
      case 'OFFICERS': {
        const termYear = this.getCurrentTermYear();
        const positions = await this.officerRepo.findByYear(termYear);
        const officerUserIds = new Set(
          positions.map(p => p.holder_user_id).filter(Boolean) as string[]
        );
        return approvedActive.filter(u => officerUserIds.has(u.id)).map(u => u.email);
      }
      case 'ALL_MEMBERS':
      default:
        return approvedActive.map(u => u.email);
    }
  }

  @Query(() => CommunicationListResult)
  async adminCommunications(
    @Arg('limit', () => Int, { defaultValue: 50 }) limit: number,
    @Arg('offset', () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() context: Context
  ): Promise<CommunicationListResult> {
    await this.requireAdmin(context);
    const { rows, total } = await this.commRepo.findAll(limit, offset);
    return {
      total,
      items: rows.map(r => this.mapRow(r)),
    };
  }

  @Query(() => Communication)
  async adminCommunication(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<Communication> {
    await this.requireAdmin(context);
    const row = await this.commRepo.findById(id);
    if (!row) {
      throw new GraphQLError('Communication not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return this.mapRow(row);
  }

  @Mutation(() => Communication)
  async sendCommunication(
    @Arg('subject') subject: string,
    @Arg('body') body: string,
    @Arg('emailType') emailType: string,
    @Arg('recipientGroup') recipientGroup: string,
    @Arg('attachmentsJson', { nullable: true }) attachmentsJson: string,
    @Ctx() context: Context
  ): Promise<Communication> {
    const senderId = await this.requireAdmin(context);

    if (subject.length > 100) {
      throw new GraphQLError('Subject must be 100 characters or fewer', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const recipientEmails = await this.getRecipientEmails(recipientGroup);
    if (recipientEmails.length === 0) {
      throw new GraphQLError('No recipients found for the selected group', {
        extensions: { code: 'BAD_INPUT' },
      });
    }

    const attachments = attachmentsJson ? JSON.parse(attachmentsJson) : [];

    const comm = await this.commRepo.create({
      sender_id: senderId,
      subject,
      body,
      email_type: emailType,
      recipient_group: recipientGroup,
      recipient_count: recipientEmails.length,
      recipient_emails: recipientEmails,
      attachments,
    });

    // Build nodemailer attachments from GCS-linked files
    const emailAttachments = attachments
      .filter((a: any) => a.type === 'link' && a.url)
      .map((a: any) => ({
        filename: a.filename,
        path: a.url,
        contentType: a.mimeType,
      }));

    const result = await emailService.sendBulkEmail({
      bccRecipients: recipientEmails,
      subject,
      html: body,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    });

    if (result.success) {
      await this.commRepo.markSent(comm.id, result.messageId || null);
    } else {
      await this.commRepo.markFailed(comm.id, result.error || 'Unknown error');
    }

    const updated = await this.commRepo.findById(comm.id);
    return this.mapRow(updated!);
  }

  private mapRow(r: any): Communication {
    return {
      id: r.id,
      subject: r.subject,
      body: r.body,
      emailType: r.email_type,
      recipientGroup: r.recipient_group,
      recipientCount: r.recipient_count,
      recipientEmails: r.recipient_emails || [],
      status: r.status,
      attachments: (r.attachments || []).map((a: any) => ({
        type: a.type,
        filename: a.filename,
        url: a.url,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
      })),
      errorMessage: r.error_message || undefined,
      sender: {
        id: r.sender_id,
        firstName: r.sender_first_name || '',
        lastName: r.sender_last_name || '',
        email: r.sender_email || '',
      },
      sentAt: r.sent_at || undefined,
      createdAt: r.created_at,
    };
  }
}
