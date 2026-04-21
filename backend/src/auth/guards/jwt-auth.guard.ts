import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { and, eq } from 'drizzle-orm';
import type { Request, Response } from 'express';

import { DrizzleService } from '../../drizzle/drizzle.service';
import { userDevices } from '../../drizzle/schema';
import { HashService } from '../../hash/hash.service';
import { computeServerFingerprint } from '../fingerprint.gen';
import { SessionsService } from '../sessions.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DrizzleService,
    private readonly hashService: HashService,
    private readonly sessions: SessionsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const session = this.db.getSession();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const isDev = process.env.NODE_ENV === 'development';

    const deviceId = req.device_id;
    const deviceSecret = req.cookies?.device_secret;
    const authToken = req.cookies?.auth_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!deviceId || !deviceSecret || !refreshToken) {
      throw new UnauthorizedException('Missing auth data');
    }

    const { fingerprint: currentFp } = computeServerFingerprint(req);

    let payload: any;
    let isRefresh = false;

    try {
      if (!authToken) {
        throw new Error();
      }
      payload = this.jwtService.verify(authToken);
      if (payload.device_id !== deviceId) throw new Error();
    } catch {
      try {
        if (!refreshToken) {
          throw new Error();
        }
        const rPayload: any = this.jwtService.verify(refreshToken);
        if (rPayload.device_id !== deviceId || rPayload.type !== 'refresh') {
          throw new Error();
        }
        payload = rPayload;
        isRefresh = true;
      } catch {
        throw new UnauthorizedException({
          error: 'session_expired',
          code: 'relogin',
          message: 'Refresh token expired. Re-authenticate.',
        });
      }
    }

    const userId = payload.sub;

    const deviceRows = await session
      .select()
      .from(userDevices)
      .where(
        and(
          eq(userDevices.userId, userId),
          eq(userDevices.deviceId, deviceId),
        ),
      )
      .limit(1);

    const deviceRecord = deviceRows[0];
    if (!deviceRecord) {
      throw new UnauthorizedException('Device not registered');
    }

    if (
      deviceRecord.deviceSecretHash !== this.hashService.sha256(deviceSecret)
    ) {
      throw new UnauthorizedException('Invalid device secret');
    }

    if (isRefresh) {
      const oldJti = payload.jti;
      if (!oldJti) {
        throw new UnauthorizedException({
          error: 'session_expired',
          code: 'relogin',
          message: 'Refresh token missing session id. Re-authenticate.',
        });
      }

      const { jti: newJti } = await this.sessions.rotate(
        userId,
        deviceId,
        oldJti,
      );

      const newAuth = this.jwtService.sign(
        {
          sub: userId,
          user_id: userId,
          device_id: deviceId,
          fingerprint: currentFp,
        },
        { expiresIn: '15m' },
      );

      const newRefresh = this.jwtService.sign(
        {
          sub: userId,
          user_id: userId,
          device_id: deviceId,
          type: 'refresh',
          jti: newJti,
        },
        { expiresIn: '90d' },
      );

      const cookieOpts = {
        httpOnly: true,
        secure: !isDev,
        sameSite: 'lax' as const,
        path: '/',
      };

      res.cookie('auth_token', newAuth, {
        ...cookieOpts,
        maxAge: 15 * 60 * 1000,
      });
      res.clearCookie('refresh_token', cookieOpts);
      res.cookie('refresh_token', newRefresh, {
        ...cookieOpts,
        maxAge: 90 * 24 * 60 * 60 * 1000,
      });

      await session
        .update(userDevices)
        .set({ lastLogin: new Date() })
        .where(
          and(
            eq(userDevices.deviceId, deviceId),
            eq(userDevices.userId, userId),
          ),
        );
    }

    req.user = payload;
    return true;
  }
}
