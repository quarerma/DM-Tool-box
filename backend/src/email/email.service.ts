import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailSendData } from '../auth/dto/email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly WEBHOOK_URL: string;

  constructor(private readonly configService: ConfigService) {
    this.WEBHOOK_URL = this.configService.get<string>('EMAIL_WEBHOOK_URL', '');
  }

  async send(data: EmailSendData): Promise<void> {
    await this.postToWebhook(
      this.WEBHOOK_URL,
      'Webhook URL is not configured. Email not sent.',
      data,
    );
  }

  async sendLoginNotification(params: {
    to: string;
    ip?: string;
    userAgent?: string;
    at: Date;
  }): Promise<void> {
    const when = params.at.toISOString();
    const where = params.ip ?? 'unknown IP';
    const ua = params.userAgent ?? 'unknown device';
    const body = [
      `A new sign-in to your account was just recorded.`,
      ``,
      `When:   ${when}`,
      `IP:     ${where}`,
      `Device: ${ua}`,
      ``,
      `If this was you, no action is needed.`,
      `If not, sign in and revoke the session from your account's devices list.`,
    ].join('\n');

    await this.send({
      emails: [params.to],
      subject: 'New sign-in to your account',
      body,
    });
  }

  private async postToWebhook(
    url: string,
    missingUrlMessage: string,
    data: EmailSendData,
  ): Promise<void> {
    if (!url) {
      this.logger.warn(missingUrlMessage);
      this.logger.warn(
        `Intended email → to=${data.emails.join(',')} subject="${data.subject}"`,
      );
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        this.logger.error(
          `Email webhook responded with ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to POST to email webhook', error as Error);
    }
  }
}
