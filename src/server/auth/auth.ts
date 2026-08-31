/**
 * Better Auth (section 3): email + password, scrypt hashing, 30-day rolling
 * httpOnly session cookie, login rate-limited to 5/min, and no public signup:
 * the first account creates the household, later accounts need a valid
 * invite cookie (set by /api/invites/[token]).
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { count } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";
import { getServices } from "@/server/services";

export const INVITE_COOKIE = "ap_invite";
const DAY = 60 * 60 * 24;

/**
 * Where the app lives. Locally that is BETTER_AUTH_URL (http://localhost:3000).
 * On Vercel the origin is derived per request so production, preview
 * deployments and a custom domain (set BETTER_AUTH_URL when you add one) all
 * pass the origin check; the production URL is the fallback.
 */
function baseURLConfig() {
  const explicit = process.env.BETTER_AUTH_URL;
  if (!process.env.VERCEL) return { baseURL: explicit, trustedOrigins: explicit ? [explicit] : undefined };
  const production =
    explicit ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  const hosts = new Set<string>(["*.vercel.app"]);
  if (production) hosts.add(new URL(production).host);
  return {
    baseURL: { allowedHosts: [...hosts], fallback: production, protocol: "https" as const },
    trustedOrigins: [...(production ? [production] : []), "https://*.vercel.app"],
  };
}

const origin = baseURLConfig();

async function authUserCount(): Promise<number> {
  const [r] = await getDb().select({ n: count() }).from(s.authUser);
  return r?.n ?? 0;
}

export const auth = betterAuth({
  appName: "Ade & P",
  baseURL: origin.baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: origin.trustedOrigins,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: s.authUser,
      session: s.authSession,
      account: s.authAccount,
      verification: s.authVerification,
      rateLimit: s.authRateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Ade & P password",
        text: `Someone (hopefully you) asked to reset the password for ${user.email}.

Reset it here (valid for 1 hour):
${url}

If this wasn't you, ignore this email; nothing changes.`,
      });
    },
  },
  session: { expiresIn: 30 * DAY, updateAge: DAY },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      if ((await authUserCount()) === 0) return; // the first account creates the household
      const token = ctx.getCookie(INVITE_COOKIE);
      const invite = token ? await getServices().households.peekInvite(token) : null;
      if (!invite)
        throw new APIError("FORBIDDEN", {
          message: "Sign-up is by invitation only. Ask your partner for a fresh invite link.",
        });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => {
          const token = ctx?.getCookie(INVITE_COOKIE);
          if (!token) return;
          try {
            await getServices().households.acceptInvite(token, user.id);
            ctx?.setCookie(INVITE_COOKIE, "", { maxAge: 0, path: "/" });
          } catch (e) {
            console.error("invite acceptance failed", e);
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
