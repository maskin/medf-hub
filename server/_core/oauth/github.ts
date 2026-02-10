import { GITHUB_SCOPES } from "@shared/const";
import { ENV } from "../env";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  private_gists: number;
  total_private_repos: number;
  owned_private_repos: number;
  disk_usage: number;
  collaborators: number;
  two_factor_authentication: boolean;
  plan: {
    name: string;
    space: number;
    private_repos: number;
    collaborators: number;
  };
}

class GitHubOAuth {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = ENV.githubClientId;
    this.clientSecret = ENV.githubClientSecret;
  }

  getAuthorizationUrl(redirectUri: string = "/"): string {
    const scopes = GITHUB_SCOPES.join(" ");
    const state = btoa(redirectUri);

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.getCallbackUrl());
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);

    return url.toString();
  }

  private getCallbackUrl(): string {
    // In production, this should be configured via environment variable
    return `${process.env.BASE_URL || "http://localhost:5173"}/api/oauth/github/callback`;
  }

  async exchangeCodeForToken(code: string): Promise<GitHubTokenResponse> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.getCallbackUrl(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to exchange code for token: ${text}`);
    }

    return response.json();
  }

  async getUserInfo(code: string): Promise<GitHubUserInfo> {
    const tokenResponse = await this.exchangeCodeForToken(code);

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userResponse.ok) {
      const text = await userResponse.text();
      throw new Error(`Failed to get user info: ${text}`);
    }

    const userData = await userResponse.json();

    // Get user emails (primary email might not be in user data)
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
        Accept: "application/json",
      },
    });

    if (emailResponse.ok) {
      const emails = await emailResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary && e.verified);
      if (primaryEmail) {
        userData.email = primaryEmail.email;
      }
    }

    return userData;
  }
}

export const githubOAuth = new GitHubOAuth();
