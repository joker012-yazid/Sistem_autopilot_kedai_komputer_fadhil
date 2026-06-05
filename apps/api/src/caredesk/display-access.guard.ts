import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { clientIp, requestMatchesDisplayCidrs } from "./display-network";

@Injectable()
export class DisplayAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!requestMatchesDisplayCidrs(request)) {
      throw new ForbiddenException(`Display access is restricted to the local network. Request IP: ${clientIp(request) ?? "unknown"}`);
    }
    return true;
  }
}
