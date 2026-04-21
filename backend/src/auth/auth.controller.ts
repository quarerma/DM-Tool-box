import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import type { UserPayload } from '../types/jwt.user.payload';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: UserLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.login(body, res);
    return { success: true };
  }

  @Post('register')
  async register(
    @Body() body: UserRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.register(body, res);
    return { success: true };
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
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }
}
