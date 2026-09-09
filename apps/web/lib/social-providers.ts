/**
 * Social account OAuth provider configuration.
 *
 * Real production values come from env vars. When env vars are missing
 * (dev/CI), the start route detects this and short-circuits to a mock
 * callback that creates a `dev_mock` SocialAccount so the full UI flow
 * is testable without provider credentials.
 */

export type Provider = 'meta' | 'youtube' | 'tiktok';

export interface ProviderConfig {
  id: Provider;
  /** Human label for UI */
  label: string;
  /** Platforms this single OAuth flow can link (Meta covers IG + FB) */
  linkedPlatforms: Array<'instagram' | 'facebook' | 'youtube' | 'tiktok'>;
  /** env var names for the OAuth client */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Provider authorize URL */
  authorizeUrl: string;
  /** Provider token endpoint */
  tokenUrl: string;
  /** Scopes to request */
  scopes: string[];
  /** Public base URL of this app (used for redirect_uri) */
  redirectPath: string;
}

const appBaseUrl = () =>
  process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  meta: {
    id: 'meta',
    label: 'Connect Instagram & Facebook',
    linkedPlatforms: ['instagram', 'facebook'],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    // For production, add pages_show_list, instagram_manage_insights
    scopes: ['instagram_basic', 'pages_show_list', 'public_profile'],
    redirectPath: '/api/social/meta/callback',
  },
  youtube: {
    id: 'youtube',
    label: 'Connect YouTube',
    linkedPlatforms: ['youtube'],
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    redirectPath: '/api/social/youtube/callback',
  },
  tiktok: {
    id: 'tiktok',
    label: 'Connect TikTok',
    linkedPlatforms: ['tiktok'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'user.info.stats'],
    redirectPath: '/api/social/tiktok/callback',
  },
};

/** Build the full redirect URI for a provider callback. */
export function redirectUri(provider: Provider): string {
  return `${appBaseUrl()}${PROVIDERS[provider].redirectPath}`;
}

/** True if all required env vars are present for a real OAuth call. */
export function hasRealCredentials(provider: Provider): boolean {
  const cfg = PROVIDERS[provider];
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}

/** Build the provider's authorize URL with state. */
export function buildAuthorizeUrl(provider: Provider, state: string): string {
  const cfg = PROVIDERS[provider];
  const clientId = process.env[cfg.clientIdEnv]!;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(provider),
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
  });
  if (provider === 'youtube') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }
  if (provider === 'tiktok') {
    params.set('response_type', 'code');
  }
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export function allowSocialMocks() { return process.env.NODE_ENV === 'development' && process.env.SOCIAL_MOCK_MODE === 'true'; }
