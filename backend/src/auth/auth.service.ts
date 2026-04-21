import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Request, Response } from 'express';

import { DrizzleService } from '../drizzle/drizzle.service';
import { loginCodes, userDevices, users } from '../drizzle/schema';
import { EmailService } from '../email/email.service';
import { HashService } from '../hash/hash.service';
import { AuthEventsService } from './auth-events.service';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';
import {
  computeServerFingerprint,
  FingerprintData,
} from './fingerprint.gen';
import { SessionsService } from './sessions.service';

type SessionTokens = {
  auth_token: string;
  refresh_token: string;
};

type LoginBody = UserLoginDto & { device_id?: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Authenticator');

  constructor(
    private readonly dataBaseService: DrizzleService,
    private readonly jwtService: JwtService,
    private readonly hash: HashService,
    private readonly email: EmailService,
    private readonly configService: ConfigService,
    private readonly sessions: SessionsService,
    private readonly events: AuthEventsService,
  ) {}

  async login(body: LoginBody, req: Request) {
    const session = this.dataBaseService.getSession();
    const environment = this.configService.get<string>('NODE_ENV');
    const normalizedEmail = body.email.toLowerCase().trim();

    const deviceId = body.device_id ?? req.device_id;
    if (!deviceId) {
      throw new HttpException('Missing device id', 400);
    }

    const response = await session
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        name: users.name,
        twofa_enabled: users.twofa_enabled,
      })
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
      .limit(1);

    const user = response[0];

    if (!user || !this.hash.verifyString(body.password, user.password)) {
      this.events.log({
        type: 'login_failure',
        userId: user?.id ?? null,
        deviceId,
        req,
        metadata: { reason: 'bad_credentials', email: normalizedEmail },
      });
      throw new HttpException('Bad credentials', 401);
    }

    const devices = await session
      .select()
      .from(userDevices)
      .where(
        and(eq(userDevices.userId, user.id), eq(userDevices.deviceId, deviceId)),
      )
      .limit(1);

    const device = devices[0];

    if (user.twofa_enabled && (!device || !device.authenticated)) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await session
        .insert(loginCodes)
        .values({
          userId: user.id,
          code,
          deviceId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        })
        .execute();

      if (environment === 'development') {
        this.logger.log(`Code to authentication: ${code}`);
      }

      await this.email.send({
        emails: [user.email],
        subject: 'New device login verification',
        body: `A login attempt was made from a new device. Your verification code is:\n\n${code}\n\nIf this wasn't you, please secure your account immediately.`,
      });

      this.events.log({
        type: 'login_new_device_challenge',
        userId: user.id,
        deviceId,
        req,
      });

      throw new HttpException(
        JSON.stringify({
          message: 'Redirecting for device verification',
          user_id: user.id,
        }),
        307,
      );
    }

    const { data, fingerprint } = computeServerFingerprint(req);

    const jti = await this.sessions.create({
      userId: user.id,
      deviceId,
    });
    const tokens = this.createSessionTokens(user, deviceId, fingerprint, jti);

    const deviceSecret = this.hash.generateRandomToken();
    const deviceSecretHash = this.hash.sha256(deviceSecret);

    await session
      .update(userDevices)
      .set({
        deviceSecretHash,
        lastLogin: new Date(),
        fingerprintData: data,
        fingerprintHash: fingerprint,
        userAgent: data.user_agent,
      })
      .where(
        and(eq(userDevices.userId, user.id), eq(userDevices.deviceId, deviceId)),
      )
      .execute();

    this.setAuthCookies(req.res!, tokens, deviceSecret);

    if (!user.twofa_enabled && !device) {
      await session
        .insert(userDevices)
        .values({
          deviceId,
          deviceSecretHash,
          fingerprintData: data,
          fingerprintHash: fingerprint,
          userAgent: data.user_agent,
          userId: user.id,
          lastLogin: new Date(),
          authenticated: true,
        })
        .execute();
    }

    this.events.log({
      type: 'login_success',
      userId: user.id,
      deviceId,
      req,
    });

    void this.email
      .sendLoginNotification({
        to: user.email,
        ip: extractClientIp(req),
        userAgent: data.user_agent || undefined,
        at: new Date(),
      })
      .catch((error) => {
        this.logger.warn(
          `Login notification email failed for user=${user.id}: ${(error as Error).message}`,
        );
      });

    return { message: 'Login successful' };
  }

  async consumeLoginCode(
    userId: number,
    code: string,
    deviceId: string,
    req: Request,
  ) {
    const session = this.dataBaseService.getSession();

    const codeRecords = await session
      .select()
      .from(loginCodes)
      .where(
        and(
          eq(loginCodes.userId, userId),
          eq(loginCodes.deviceId, deviceId),
          eq(loginCodes.code, code),
        ),
      )
      .orderBy(desc(loginCodes.createdAt))
      .limit(1);

    if (codeRecords.length === 0) {
      throw new HttpException('Invalid verification code', 403);
    }

    const codeRecord = codeRecords[0];

    if (codeRecord.expiresAt < new Date()) {
      await session
        .delete(loginCodes)
        .where(eq(loginCodes.id, codeRecord.id))
        .execute();
      throw new HttpException('Verification code has expired', 403);
    }

    await session
      .delete(loginCodes)
      .where(eq(loginCodes.id, codeRecord.id))
      .execute();

    const { data, fingerprint } = computeServerFingerprint(req);

    const deviceSecret = this.hash.generateRandomToken();
    const deviceSecretHash = this.hash.sha256(deviceSecret);

    const existing = await session
      .select()
      .from(userDevices)
      .where(
        and(
          eq(userDevices.deviceId, deviceId),
          eq(userDevices.userId, userId),
          eq(userDevices.authenticated, false),
        ),
      );

    if (existing.length > 0) {
      await session
        .update(userDevices)
        .set({
          deviceSecretHash,
          fingerprintData: data,
          fingerprintHash: fingerprint,
          userAgent: data.user_agent,
          lastLogin: new Date(),
          authenticated: true,
        })
        .where(
          and(
            eq(userDevices.userId, userId),
            eq(userDevices.deviceId, deviceId),
          ),
        );
    } else {
      await session
        .insert(userDevices)
        .values({
          deviceId,
          deviceSecretHash,
          fingerprintData: data,
          fingerprintHash: fingerprint,
          userAgent: data.user_agent,
          userId,
          lastLogin: new Date(),
          authenticated: true,
        })
        .execute();
    }

    const userRow = await session
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRow.length === 0) {
      throw new HttpException('User not found', 404);
    }

    const jti = await this.sessions.create({
      userId: userRow[0].id,
      deviceId,
    });
    const tokens = this.createSessionTokens(
      userRow[0],
      deviceId,
      fingerprint,
      jti,
    );
    this.setAuthCookies(req.res!, tokens, deviceSecret);

    this.events.log({
      type: 'device_verified',
      userId: userRow[0].id,
      deviceId,
      req,
    });

    void this.email
      .sendLoginNotification({
        to: userRow[0].email,
        ip: extractClientIp(req),
        userAgent: data.user_agent || undefined,
        at: new Date(),
      })
      .catch((error) => {
        this.logger.warn(
          `Login notification email failed for user=${userRow[0].id}: ${(error as Error).message}`,
        );
      });

    return { message: 'Device verified and logged in successfully' };
  }

  async register(dto: UserRegisterDto) {
    const session = this.dataBaseService.getSession();
    const normalizedEmail = dto.email.toLowerCase().trim();

    const registered = await session
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
      .limit(1);

    if (registered.length > 0) {
      return { message: 'User with provided email already exists.' };
    }

    const hashed_password = this.hash.hashString(dto.password);

    const inserted = await session
      .insert(users)
      .values({
        name: dto.name,
        email: normalizedEmail,
        password: hashed_password,
      })
      .returning({ insertedId: users.id });

    const payload = { sub: inserted[0].insertedId };
    const token = await this.jwtService.signAsync(payload);

    this.events.log({
      type: 'register',
      userId: inserted[0].insertedId,
      metadata: { email: normalizedEmail },
    });

    return { token };
  }

  createSessionTokens(
    user: { id: number },
    device_id: string,
    current_fingerprint: string,
    jti: string,
  ): SessionTokens {
    const auth_token = this.jwtService.sign(
      {
        sub: user.id,
        user_id: user.id,
        device_id,
        fingerprint: current_fingerprint,
      },
      { expiresIn: '15m' },
    );

    const refresh_token = this.jwtService.sign(
      {
        sub: user.id,
        user_id: user.id,
        device_id,
        type: 'refresh',
        jti,
      },
      { expiresIn: '90d' },
    );

    return { auth_token, refresh_token };
  }

  setAuthCookies(
    res: Response,
    tokens: SessionTokens,
    device_secret: string,
  ) {
    const isDev = process.env.NODE_ENV === 'development';
    const opts = {
      httpOnly: true,
      secure: !isDev,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('auth_token', tokens.auth_token, {
      ...opts,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      ...opts,
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    res.cookie('device_secret', device_secret, {
      ...opts,
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });
  }

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    let userId: number | null = null;
    let deviceId: string | null = null;

    if (refreshToken) {
      try {
        const payload: any = this.jwtService.verify(refreshToken);
        if (payload?.sub && payload?.device_id) {
          userId = Number(payload.sub);
          deviceId = String(payload.device_id);
          await this.sessions.revokeByDevice(userId, deviceId);
        }
      } catch {
        // Expired/invalid refresh token — still clear cookies below.
      }
    }

    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('device_secret', { path: '/' });

    this.events.log({
      type: 'logout',
      userId,
      deviceId,
      req,
    });
  }

  compareFingerprintFields(current: FingerprintData, stored: FingerprintData) {
    let strict = 0;
    let balanced = 0;
    let nonCritical = 0;

    if (current.ua_major !== stored.ua_major) strict++;
    if (current.platform !== stored.platform) strict++;
    if (current.device_class !== stored.device_class) strict++;
    if (current.os_family !== stored.os_family) strict++;

    if (current.accept !== stored.accept) balanced++;
    if (current.encoding !== stored.encoding) balanced++;

    if (current.language !== stored.language) nonCritical++;
    if (current.user_agent !== stored.user_agent) nonCritical++;
    if (current.ja3 !== stored.ja3) nonCritical++;

    return { strict, balanced, nonCritical };
  }
}

function extractClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}
