import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { AuthProvider } from "@shared/types";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { googleOAuth } from "./oauth/google";
import { githubOAuth } from "./oauth/github";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getOrigin(req: Request): string {
  const proto = req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

export function registerOAuthRoutes(app: Express) {
  // Manus OAuth callback (existing)
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Manus callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Google OAuth callback
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[OAuth] Google error:", error);
      res.redirect(302, "/login?error=google_error");
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const userInfo = await googleOAuth.getUserInfo(code);

      // Generate openId from Google sub
      const openId = `google:${userInfo.sub}`;

      await db.upsertUser({
        openId,
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.redirect(302, "/login?error=google_callback_failed");
    }
  });

  // GitHub OAuth callback
  app.get("/api/oauth/github/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    console.log("[OAuth] GitHub callback received:", { code: !!code, state: !!state, error });

    if (error) {
      console.error("[OAuth] GitHub error:", error);
      res.redirect(302, "/login?error=github_error");
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Fetching GitHub user info...");
      const userInfo = await githubOAuth.getUserInfo(code);
      console.log("[OAuth] GitHub user info received:", { id: userInfo.id, login: userInfo.login, email: userInfo.email });

      // Generate openId from GitHub id
      const openId = `github:${userInfo.id}`;

      console.log("[OAuth] Upserting user to database...");
      await db.upsertUser({
        openId,
        name: userInfo.name || userInfo.login,
        email: userInfo.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });

      console.log("[OAuth] Creating session token...");
      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || userInfo.login,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      console.log("[OAuth] Setting cookie with options:", cookieOptions);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[OAuth] Redirecting to home...");
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] GitHub callback failed", error);
      res.redirect(302, "/login?error=github_callback_failed");
    }
  });

  // OAuth authorization endpoint (initiates OAuth flow)
  app.get("/api/oauth/authorize", (req: Request, res: Response) => {
    const provider = getQueryParam(req, "provider") as AuthProvider;
    const redirectUri = getQueryParam(req, "redirectUri") || "/";

    if (!provider) {
      res.status(400).json({ error: "provider is required" });
      return;
    }

    let authUrl: string;

    switch (provider) {
      case "manus":
        // Manus uses the existing portal flow
        if (!ENV.oAuthServerUrl) {
          res.status(501).json({ error: "Manus OAuth is not configured. Please set OAUTH_SERVER_URL environment variable." });
          return;
        }
        const oauthPortalUrl = ENV.oAuthServerUrl;
        const origin = getOrigin(req);
        const state = btoa(`${origin}/api/oauth/callback`);
        const url = new URL(`${oauthPortalUrl}/app-auth`);
        url.searchParams.set("appId", ENV.appId);
        url.searchParams.set("redirectUri", `${origin}/api/oauth/callback`);
        url.searchParams.set("state", state);
        url.searchParams.set("type", "signIn");
        authUrl = url.toString();
        break;

      case "google":
        authUrl = googleOAuth.getAuthorizationUrl(redirectUri);
        break;

      case "github":
        authUrl = githubOAuth.getAuthorizationUrl(redirectUri);
        break;

      default:
        res.status(400).json({ error: "Invalid provider" });
        return;
    }

    res.redirect(302, authUrl);
  });
}
