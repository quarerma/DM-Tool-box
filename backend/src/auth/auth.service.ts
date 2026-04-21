import {
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';

import { DrizzleService } from '../drizzle/drizzle.service';
import { users } from '../drizzle/schema';
import { HashService } from '../hash/hash.service';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';

type SessionTokens = {
  auth_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Authenticator');

  constructor(
    private readonly dataBaseService: DrizzleService,
    private readonly jwtService: JwtService,
    private readonly hash: HashService,
  ) {}

  async login(body: UserLoginDto, res: Response) {
    const session = this.dataBaseService.getSession();
    const normalizedEmail = body.email.toLowerCase().trim();

    const response = await session
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        name: users.name,
      })
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
      .limit(1);

    const user = response[0];

    if (!user || !this.hash.verifyString(body.password, user.password)) {
      throw new HttpException('Bad credentials', 401);
    }

    const tokens = this.createSessionTokens({ id: user.id });
    this.setAuthCookies(res, tokens);

    return { message: 'Login successful' };
  }

  async register(dto: UserRegisterDto, res: Response) {
    const session = this.dataBaseService.getSession();
    const normalizedEmail = dto.email.toLowerCase().trim();

    const registered = await session
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${normalizedEmail}`)
      .limit(1);

    if (registered.length > 0) {
      throw new HttpException('User with provided email already exists.', 409);
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

    const newUserId = inserted[0].insertedId;
    const tokens = this.createSessionTokens({ id: newUserId });
    this.setAuthCookies(res, tokens);

    return { message: 'Registration successful' };
  }

  createSessionTokens(user: { id: number }): SessionTokens {
    const auth_token = this.jwtService.sign(
      { sub: user.id, user_id: user.id },
      { expiresIn: '15m' },
    );

    const refresh_token = this.jwtService.sign(
      { sub: user.id, user_id: user.id, type: 'refresh' },
      { expiresIn: '90d' },
    );

    return { auth_token, refresh_token };
  }

  setAuthCookies(res: Response, tokens: SessionTokens) {
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
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  requireUser(payload: unknown) {
    if (!payload) {
      throw new UnauthorizedException('Session not found');
    }
    return payload;
  }
}
