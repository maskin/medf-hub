/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/**
 * Authentication provider types
 */
export type AuthProvider = "manus" | "google" | "github";

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  id: AuthProvider;
  name: string;
  displayName: string;
  icon: string;
  color: string;
}

/**
 * Supported auth providers with UI configuration
 */
export const AUTH_PROVIDERS: Record<AuthProvider, AuthProviderConfig> = {
  manus: {
    id: "manus",
    name: "Manus",
    displayName: "Manus",
    icon: "M",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  google: {
    id: "google",
    name: "Google",
    displayName: "Google",
    icon: "G",
    color: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
  },
  github: {
    id: "github",
    name: "GitHub",
    displayName: "GitHub",
    icon: "GH",
    color: "bg-gray-900 hover:bg-gray-800 text-white",
  },
};
