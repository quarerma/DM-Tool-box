import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { UserPayload } from '../../types/jwt.user.payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload | null => {
    const request = ctx.switchToHttp().getRequest();
    return (request.user as UserPayload) ?? null;
  },
);
