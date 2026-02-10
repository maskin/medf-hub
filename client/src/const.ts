export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { AuthProvider } from "@shared/types";

/**
 * Generate authorization URL for a specific auth provider
 * @param provider - The auth provider to use
 * @param redirectUri - Where to redirect after successful auth (default: "/")
 */
export const getAuthUrl = (provider: AuthProvider, redirectUri: string = "/") => {
  const url = new URL(`${window.location.origin}/api/oauth/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirectUri", redirectUri);
  return url.toString();
};

/**
 * Legacy function for backward compatibility
 * Defaults to manus provider
 */
export const getLoginUrl = () => getAuthUrl("manus");
