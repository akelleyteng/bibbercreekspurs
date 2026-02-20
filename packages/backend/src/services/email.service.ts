import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import db from '../models/database';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId: string;
  eventType: string;
  relatedResourceId?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private smtpConfigured = false;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        logger.warn('SMTP not configured - emails will be logged but not sent');
        this.transporter = nodemailer.createTransport({ jsonTransport: true });
        this.smtpConfigured = false;
        return this.transporter;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.smtpConfigured = true;
    }
    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const from = process.env.SMTP_FROM || 'noreply@bibbercreekspurs4h.org';

    try {
      const transport = this.getTransporter();
      const info = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      const messageId = this.smtpConfigured ? (info.messageId || null) : null;

      if (!this.smtpConfigured) {
        logger.info(`Email (not sent, SMTP not configured): ${options.eventType} to ${options.to}`);
      }

      await this.logNotification({
        userId: options.userId,
        recipientEmail: options.to,
        eventType: options.eventType,
        relatedResourceId: options.relatedResourceId,
        status: this.smtpConfigured ? 'SENT' : 'LOGGED_ONLY',
        messageId,
      });

      if (this.smtpConfigured) {
        logger.info(`Email sent: ${options.eventType} to ${options.to}`);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to send email: ${options.eventType} to ${options.to}`, error);

      await this.logNotification({
        userId: options.userId,
        recipientEmail: options.to,
        eventType: options.eventType,
        relatedResourceId: options.relatedResourceId,
        status: 'FAILED',
        messageId: null,
      });

      return false;
    }
  }

  private async logNotification(data: {
    userId: string;
    recipientEmail: string;
    eventType: string;
    relatedResourceId?: string;
    status: string;
    messageId: string | null;
  }): Promise<void> {
    try {
      await db.query(
        `INSERT INTO email_notifications_sent
         (user_id, recipient_email, event_type, related_resource_id, status, aws_message_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.userId,
          data.recipientEmail,
          data.eventType,
          data.relatedResourceId || null,
          data.status,
          data.messageId,
        ]
      );
    } catch (error) {
      logger.error('Failed to log email notification:', error);
    }
  }

  async notifyAdminNewRegistration(
    adminEmail: string,
    memberName: string,
    memberEmail: string,
    memberRole: string,
    userId: string
  ): Promise<void> {
    await this.sendEmail({
      to: adminEmail,
      subject: `New Member Registration: ${memberName}`,
      html: `
        <h2>New Member Registration</h2>
        <p>A new member has registered and is awaiting your approval:</p>
        <ul>
          <li><strong>Name:</strong> ${memberName}</li>
          <li><strong>Email:</strong> ${memberEmail}</li>
          <li><strong>Role:</strong> ${memberRole}</li>
        </ul>
        <p>Please log in to the <a href="https://bibbercreekspurs4h.org/admin">Admin Panel</a> to review this registration.</p>
      `,
      userId,
      eventType: 'REGISTRATION_PENDING',
      relatedResourceId: userId,
    });
  }

  async notifyMemberApproved(memberEmail: string, memberName: string, userId: string): Promise<void> {
    await this.sendEmail({
      to: memberEmail,
      subject: 'Your Bibber Creek Spurs Account Has Been Approved!',
      html: `
        <h2>Welcome to Bibber Creek Spurs, ${memberName}!</h2>
        <p>Your account has been approved. You can now log in at:</p>
        <p><a href="https://bibbercreekspurs4h.org/login">bibbercreekspurs4h.org/login</a></p>
        <p>See you at the next meeting!</p>
      `,
      userId,
      eventType: 'ACCOUNT_APPROVED',
      relatedResourceId: userId,
    });
  }

  async notifyMemberDeclined(
    memberEmail: string,
    memberName: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    await this.sendEmail({
      to: memberEmail,
      subject: 'Bibber Creek Spurs Account Registration Update',
      html: `
        <h2>Registration Update</h2>
        <p>Hi ${memberName},</p>
        <p>Unfortunately, your registration for the Bibber Creek Spurs 4H club website was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is an error, please contact the club leadership.</p>
      `,
      userId,
      eventType: 'ACCOUNT_DECLINED',
      relatedResourceId: userId,
    });
  }
}

export const emailService = new EmailService();
