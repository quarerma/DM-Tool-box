import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequireDeviceIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const deviceId = req.headers['x-device-id'];
    if (deviceId && typeof deviceId === 'string') {
      req.device_id = deviceId;
    } else {
      throw new BadRequestException('Missing or invalid X-Device-ID header');
    }
    next();
  }
}
