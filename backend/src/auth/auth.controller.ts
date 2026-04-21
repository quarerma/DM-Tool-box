import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { UserPayload } from '../types/jwt.user.payload';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() body: UserLoginDto, @Req() req: Request) {
    await this.authService.login(
      { ...body, device_id: req.device_id },
      req,
    );
    return { success: true };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-device')
  async verifyDevice(
    @Body() body: { code: string; user_id: number },
    @Req() req: Request,
  ) {
    if (!req.device_id) {
      throw new UnauthorizedException('Missing device id');
    }
    return this.authService.consumeLoginCode(
      Number(body.user_id),
      body.code,
      req.device_id,
      req,
    );
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('register')
  register(@Body() body: UserRegisterDto) {
    return this.authService.register(body);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  checkAuth(@CurrentUser() user: UserPayload | null) {
    if (!user) {
      throw new UnauthorizedException('Session not found');
    }
    return true;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req, res);
    return { message: 'Logged out successfully' };
  }
}
