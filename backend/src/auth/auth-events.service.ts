import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

import { DrizzleService } from '../drizzle/drizzle.service';
import { authEvents } from '../drizzle/schema';

export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'login_new_device_challenge'
  | 'device_verified'
  | 'device_verification_failed'
  | 'register'
  | 'logout'
  | 'session_revoked'
  | 'session_revoked_all'
  | 'token_reuse_detected';

type LogParams = {
  type: AuthEventType;
  userId?: number | null;
  deviceId?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuthEventsService {
  private readonly logger = new Logger('AuthEvents');

  constructor(private readonly db: DrizzleService) {}

  log(params: LogParams): void {
    // Fire-and-forget: an audit write must never break the auth flow.
    void this.write(params).catch((error) => {
      this.logger.error(
        `Failed to persist auth event type=${params.type} user=${
          params.userId ?? 'n/a'
        }`,
        error as Error,
      );
    });
  }

  private async write(params: LogParams): Promise<void> {
    const ip = params.req ? extractIp(params.req) : undefined;
    const userAgent = params.req
      ? normalizeHeader(params.req.headers['user-agent'])
      : undefined;

    await this.db.getSession().insert(authEvents).values({
      userId: params.userId ?? null,
      deviceId: params.deviceId ?? null,
      eventType: params.type,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: params.metadata ?? null,
    });
  }
}

function extractIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}
