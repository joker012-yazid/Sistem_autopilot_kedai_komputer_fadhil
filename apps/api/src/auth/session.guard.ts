import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Inject } from "@nestjs/common";
import type { Request } from "express";
import type { UserRecord } from "./user-record";
import { PrismaService } from "../database/prisma.service";
import { getCaredeskAllowedOrigins } from "./caredesk-origin";

function invalidUser(userId = "anonymous"): UserRecord {
  return {
    id: userId,
    name: "Invalid demo user",
    role: "invalid",
    branchId: "branch_main",
    organizationId: "org_fadhil"
  };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    request.user = invalidUser();
    this.assertTrustedOrigin(request);
    if (this.isPublicAuthRoute(request)) {
      return true;
    }
    const sessionId = this.sessionIdFromCookie(request.header("cookie") ?? "");
    if (!sessionId) {
      throw new UnauthorizedException("CareDesk session is required");
    }
    const session = await this.prisma.caredeskSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || session.user.status !== "active") {
      throw new UnauthorizedException("CareDesk session is invalid or expired");
    }
    await this.prisma.caredeskSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });
    request.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      branchId: "branch_main",
      organizationId: "org_fadhil"
    } satisfies UserRecord;
    return true;
  }

  private isPublicAuthRoute(request: Request) {
    const path = request.path ?? request.originalUrl;
    return (
      request.method === "GET" && path === "/caredesk/auth/setup-status"
    ) || (
      request.method === "POST" && ["/caredesk/auth/setup", "/caredesk/auth/login"].includes(path)
    );
  }

  private sessionIdFromCookie(cookieHeader: string): string | undefined {
    return cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("caredesk_session="))
      ?.slice("caredesk_session=".length);
  }

  private assertTrustedOrigin(request: Request) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      return;
    }
    const origin = request.header("origin");
    if (!origin) {
      return;
    }
    const allowed = new Set(getCaredeskAllowedOrigins());
    if (!allowed.has(origin)) {
      throw new ForbiddenException("Request origin is not allowed");
    }
  }
}
