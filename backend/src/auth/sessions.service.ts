import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { DrizzleService } from '../drizzle/drizzle.service';
import { userSessions } from '../drizzle/schema';
import { AuthEventsService } from './auth-events.service';

const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const RACE_GRACE_MS = 5_000;

@Injectable()
export class SessionsService {
  private readonly logger = new Logger('SessionsService');

  constructor(
    private readonly db: DrizzleService,
    private readonly events: AuthEventsService,
  ) {}

  async create(params: { userId: number; deviceId: string }): Promise<string> {
    const session = this.db.getSession();
    const jti = randomUUID();
    const now = new Date();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await session
      .insert(userSessions)
      .values({
        userId: params.userId,
        deviceId: params.deviceId,
        currentJti: jti,
        previousJti: null,
        lastRefreshedAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [userSessions.userId, userSessions.deviceId],
        set: {
          currentJti: jti,
          previousJti: null,
          lastRefreshedAt: now,
          expiresAt,
          revokedAt: null,
        },
      });

    return jti;
  }

  async rotate(
    userId: number,
    deviceId: string,
    oldJti: string,
  ): Promise<{ jti: string; rotated: boolean }> {
    const session = this.db.getSession();

    const rows = await session
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.deviceId, deviceId),
        ),
      )
      .limit(1);

    const current = rows[0];
    if (!current) {
      throw new UnauthorizedException('Session not found');
    }
    if (current.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }

    if (current.currentJti === oldJti) {
      const jti = randomUUID();
      const now = new Date();
      await session
        .update(userSessions)
        .set({
          previousJti: current.currentJti,
          currentJti: jti,
          lastRefreshedAt: now,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        })
        .where(eq(userSessions.id, current.id));
      return { jti, rotated: true };
    }

    const lastRefreshMs = current.lastRefreshedAt.getTime();
    const since = Date.now() - lastRefreshMs;
    if (current.previousJti === oldJti && since < RACE_GRACE_MS) {
      this.logger.warn(
        `Concurrent refresh race observed for user=${userId} device=${deviceId} (within ${since}ms)`,
      );
      return { jti: current.currentJti, rotated: false };
    }

    this.logger.warn(
      `Refresh token reuse detected for user=${userId} device=${deviceId}. Revoking all sessions.`,
    );
    this.events.log({
      type: 'token_reuse_detected',
      userId,
      deviceId,
      metadata: { presentedJti: oldJti, currentJti: current.currentJti },
    });
    await this.revokeAll(userId, { skipEvent: true });
    this.events.log({
      type: 'session_revoked_all',
      userId,
      metadata: { reason: 'token_reuse_detected' },
    });
    throw new UnauthorizedException({
      error: 'token_reuse_detected',
      code: 'relogin',
      message: 'Refresh token reuse detected. All sessions have been revoked.',
    });
  }

  async revokeByDevice(userId: number, deviceId: string) {
    await this.db
      .getSession()
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.deviceId, deviceId),
          isNull(userSessions.revokedAt),
        ),
      );
    this.events.log({
      type: 'session_revoked',
      userId,
      deviceId,
    });
  }

  async revokeAll(userId: number, opts: { skipEvent?: boolean } = {}) {
    await this.db
      .getSession()
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt),
        ),
      );
    if (!opts.skipEvent) {
      this.events.log({
        type: 'session_revoked_all',
        userId,
      });
    }
  }
}
