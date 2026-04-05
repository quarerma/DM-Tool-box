import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { HashService } from '../hash/hash.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { UserRegisterDto } from './dto/user-register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
  ) {}

  async login(dto: UserLoginDto) {
    // Placeholder for DB lookup + fingerprint checks + device verification flow.
    return {
      message: 'Login placeholder. Connect users table and session logic.',
      email: dto.email,
    };
  }

  async register(dto: UserRegisterDto) {
    // Placeholder hash call to keep auth dependencies wired and testable.
    const passwordHash = await this.hashService.hash(dto.password);
    return {
      message: 'Register placeholder. Persist user once schema is ready.',
      email: dto.email,
      passwordHashPreview: `${passwordHash.slice(0, 12)}...`,
    };
  }

  async check() {
    return { authenticated: false, placeholder: true };
  }

  async logout() {
    return { ok: true };
  }

  async changePassword(_dto: ChangePasswordDto) {
    return {
      message: 'Change-password placeholder. Attach user/session validation.',
    };
  }

  signToken(payload: Record<string, unknown>) {
    return this.jwtService.sign(payload);
  }
}
