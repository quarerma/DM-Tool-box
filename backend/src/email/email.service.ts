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
