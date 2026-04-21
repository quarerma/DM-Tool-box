import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { DrizzleModule } from '../drizzle/drizzle.module';
import { HashModule } from '../hash/hash.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEventsService } from './auth-events.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    HashModule,
    DrizzleModule,
    JwtModule.registerAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,
    AuthEventsService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    JwtStrategy,
    AuthService,
    SessionsService,
    AuthEventsService,
  ],
})
export class AuthModule {}
