import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: UserLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Placeholder cookie token to keep frontend withCredentials flow compatible.
    const token = this.authService.signToken({
      sub: 'placeholder-user-id',
      email: dto.email,
    });
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    return result;
  }

  @Post('register')
  async register(@Body() dto: UserRegisterDto) {
    return this.authService.register(dto);
  }

  @Get('check')
  async check(@Req() req: Request) {
    return {
      ...(await this.authService.check()),
      hasAuthCookie: Boolean(req.cookies?.auth_token),
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token');
    return this.authService.logout();
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }
}
