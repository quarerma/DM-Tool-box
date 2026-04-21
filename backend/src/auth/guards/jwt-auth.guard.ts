import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const isDev = process.env.NODE_ENV === 'development';

    const authToken = req.cookies?.auth_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!authToken && !refreshToken) {
      throw new UnauthorizedException('Missing auth data');
    }

    let payload: any;
    let isRefresh = false;

    try {
      if (!authToken) {
        throw new Error();
      }
      payload = this.jwtService.verify(authToken);
    } catch {
      try {
        if (!refreshToken) {
          throw new Error();
        }
        const rPayload: any = this.jwtService.verify(refreshToken);
        if (rPayload.type !== 'refresh') {
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

    if (isRefresh) {
      const userId = payload.sub;

      const newAuth = this.jwtService.sign(
        { sub: userId, user_id: userId },
        { expiresIn: '15m' },
      );
      const newRefresh = this.jwtService.sign(
        { sub: userId, user_id: userId, type: 'refresh' },
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
    }

    req.user = payload;
    return true;
  }
}
