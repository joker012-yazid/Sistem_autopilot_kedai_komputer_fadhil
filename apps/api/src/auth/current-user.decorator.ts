import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { UserRecord } from "./user-record";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): UserRecord => {
  const request = context.switchToHttp().getRequest<{ user: UserRecord }>();
  return request.user;
});
