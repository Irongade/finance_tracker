/**
 * Controller helpers (section 6.1): authenticate, guard against cross-site
 * writes, parse with Zod, map typed errors to HTTP. Route handlers stay thin.
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { auth } from "@/server/auth/auth";
import {
  ConflictError,
  DomainRuleError,
  ForbiddenError,
  isDomainError,
  NotFoundError,
  UnauthorizedError,
} from "@/server/errors";
import type { Membership } from "@/server/repositories";
import { getServices } from "@/server/services";

export interface RequestContext {
  authUserId: string;
  membership: Membership;
  householdId: string;
  services: ReturnType<typeof getServices>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Reject state-changing requests whose Origin is not this site (CSRF, section 3). */
function assertSameOrigin(req: Request): void {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return;
  if (new URL(origin).host !== host) throw new ForbiddenError("Cross-site request blocked");
}

export async function requireContext(req: Request): Promise<RequestContext> {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  const services = getServices();
  const membership = await services.households.membershipFor(session.user.id);
  if (!membership) throw new ForbiddenError("Finish setting up your household first");
  return { authUserId: session.user.id, membership, householdId: membership.householdId, services };
}

/** Session only, for onboarding endpoints that run before a household exists. */
export async function requireSession(
  req: Request,
): Promise<{ authUserId: string; services: ReturnType<typeof getServices> }> {
  assertSameOrigin(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  return { authUserId: session.user.id, services: getServices() };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join(".") || "_"] = issue.message;
    throw new HttpError(422, "Check the highlighted fields", { fields });
  }
  return result.data;
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError)
    return NextResponse.json({ error: e.message, ...(e.details ? { details: e.details } : {}) }, { status: e.status });
  if (isDomainError(e)) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof ConflictError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof DomainRuleError) {
      return NextResponse.json(
        { error: e.message, details: e.field ? { fields: { [e.field]: e.message } } : undefined },
        { status: 422 },
      );
    }
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: e.message }, { status: 401 });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

/** Wraps a handler so every controller is: context -> parse -> one service call -> json. */
export function handler<A extends unknown[]>(fn: (req: Request, ...args: A) => Promise<NextResponse>) {
  return async (req: Request, ...args: A): Promise<NextResponse> => {
    try {
      return await fn(req, ...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export type RouteParams<K extends string> = { params: Promise<Record<K, string>> };
