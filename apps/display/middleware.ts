import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const defaultCidrs = ["127.0.0.1/32", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const ip = resolveRequestIp(request);
  if (!ip || !allowedCidrs().some((cidr) => ipInCidr(ip, cidr))) {
    return new NextResponse("Display access is restricted to the local network.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

function allowedCidrs() {
  return process.env.CAREDESK_DISPLAY_ALLOWED_CIDRS
    ?.split(",")
    .map((cidr) => cidr.trim())
    .filter(Boolean) ?? defaultCidrs;
}

function resolveRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const host = request.nextUrl.hostname;
  const candidate = forwarded || realIp || host;
  if (!candidate) {
    return undefined;
  }
  if (candidate.startsWith("::ffff:")) {
    return candidate.slice("::ffff:".length);
  }
  return candidate;
}

function ipInCidr(address: string, cidr: string) {
  const [range, prefixValue] = cidr.split("/");
  const prefix = Number(prefixValue);
  if (!range || !Number.isFinite(prefix)) {
    return false;
  }
  if (isIpv4(range) && isIpv4(address)) {
    return ipv4InCidr(address, range, prefix);
  }
  if (isIpv6(range) && isIpv6(address)) {
    return ipv6InCidr(address, range, prefix);
  }
  return false;
}

function ipv4InCidr(address: string, range: string, prefix: number) {
  if (prefix < 0 || prefix > 32) return false;
  const addressValue = ipv4ToInt(address);
  const rangeValue = ipv4ToInt(range);
  if (addressValue === undefined || rangeValue === undefined) return false;
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  return (addressValue & mask) === (rangeValue & mask);
}

function ipv6InCidr(address: string, range: string, prefix: number) {
  if (prefix < 0 || prefix > 128) return false;
  const addressValue = ipv6ToBigInt(address);
  const rangeValue = ipv6ToBigInt(range);
  if (addressValue === undefined || rangeValue === undefined) return false;
  const mask = prefix === 0 ? 0n : (((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix));
  return (addressValue & mask) === (rangeValue & mask);
}

function isIpv4(value: string) {
  return value.includes(".");
}

function isIpv6(value: string) {
  return value.includes(":");
}

function ipv4ToInt(value: string) {
  const octets = value.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return undefined;
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function ipv6ToBigInt(value: string) {
  const normalized = expandIpv6(value);
  if (!normalized) {
    return undefined;
  }
  return normalized.reduce((result, part) => (result << 16n) + BigInt(part), 0n);
}

function expandIpv6(value: string) {
  const pieces = value.split("::");
  if (pieces.length > 2) {
    return undefined;
  }
  const [head = "", tail = ""] = pieces;
  const headParts = expandEmbeddedIpv4(head ? head.split(":").filter(Boolean) : []);
  const tailParts = expandEmbeddedIpv4(tail ? tail.split(":").filter(Boolean) : []);
  if (!headParts || !tailParts) {
    return undefined;
  }
  const missing = 8 - (headParts.length + tailParts.length);
  if ((!value.includes("::") && missing !== 0) || missing < 0) {
    return undefined;
  }
  return [...headParts, ...Array(Math.max(missing, 0)).fill(0), ...tailParts];
}

function expandEmbeddedIpv4(parts: string[]) {
  const expanded: number[] = [];
  for (const part of parts) {
    if (part.includes(".")) {
      const ipv4 = ipv4ToInt(part);
      if (ipv4 === undefined) {
        return undefined;
      }
      expanded.push((ipv4 >>> 16) & 0xffff, ipv4 & 0xffff);
      continue;
    }
    const parsed = Number.parseInt(part, 16);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffff) {
      return undefined;
    }
    expanded.push(parsed);
  }
  return expanded;
}
