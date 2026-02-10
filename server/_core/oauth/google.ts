import { GOOGLE_SCOPES } from "@shared/const";
import { ENV } from "../env";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

class GoogleOAuth {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = ENV.googleClientId;
    this.clientSecret = ENV.googleClientSecret;
    this.redirectUri = ""; // Will be set dynamically
  }

  getAuthorizationUrl(redirectUri: string = "/"): string {
    const scopes = GOOGLE_SCOPES.join(" ");
    const state = btoa(redirectUri);

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.getCallbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);

    return url.toString();
  }

  private getCallbackUrl(): string {
    // In production, this should be configured via environment variable
    return `${process.env.BASE_URL || "http://localhost:5173"}/api/oauth/google/callback`;
  }

  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.getCallbackUrl(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to exchange code for token: ${text}`);
    }

    return response.json();
  }

  async getUserInfo(code: string): Promise<GoogleUserInfo> {
    const tokenResponse = await this.exchangeCodeForToken(code);

    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get user info: ${text}`);
    }

    return response.json();
  }
}

export const googleOAuth = new GoogleOAuth();
