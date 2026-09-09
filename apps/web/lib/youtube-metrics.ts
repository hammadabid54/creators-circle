import { z } from 'zod';
import { db } from '@/lib/db';
import { recordMetrics } from '@/lib/creator-metrics';
const channelSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({ title: z.string(), customUrl: z.string().optional() }),
      statistics: z.object({
        subscriberCount: z.string().optional(),
        hiddenSubscriberCount: z.boolean().optional(),
      }),
    }),
  ),
});
export async function fetchYouTubeChannel(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    {
      headers: { Authorization: 'Bearer ' + accessToken },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok)
    throw new Error('YouTube could not be refreshed. Reconnect your account or try again later.');
  const channel = channelSchema.parse(await response.json()).items[0];
  if (!channel || channel.statistics.hiddenSubscriberCount || !channel.statistics.subscriberCount)
    throw new Error('This channel does not expose subscriber statistics.');
  const followers = Number(channel.statistics.subscriberCount);
  if (!Number.isSafeInteger(followers) || followers < 0 || followers > 2147483647)
    throw new Error('Invalid subscriber count.');
  return {
    externalId: channel.id,
    handle: (channel.snippet.customUrl || channel.snippet.title).replace(/^@/, ''),
    followers,
  };
}
export async function syncYouTubeAccount(id: string) {
  const account = await db.socialAccount.findUnique({ where: { id } });
  if (
    !account ||
    account.platform !== 'youtube' ||
    account.connectionState === 'dev_mock' ||
    !account.accessToken
  )
    throw new Error('Connect a real YouTube account first.');

  if (account.lastSyncedAt && Date.now() - +account.lastSyncedAt < 3600000)
    throw new Error('Statistics were refreshed recently. Try again in an hour.');
  let accessToken = account.accessToken;
  if (!account.tokenExpiresAt || +account.tokenExpiresAt <= Date.now() + 60000) {
    if (!account.refreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      throw new Error('Reconnect YouTube to refresh your statistics.');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('YouTube authorization has expired. Please reconnect.');
    const token = z
      .object({
        access_token: z.string().min(1),
        expires_in: z.number().positive(),
        refresh_token: z.string().optional(),
      })
      .parse(await response.json());
    accessToken = token.access_token;
    await db.socialAccount.update({
      where: { id },
      data: {
        accessToken,
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}),
      },
    });
  }
  const metrics = await fetchYouTubeChannel(accessToken);
  const observedAt = new Date();
  await recordMetrics({
    socialAccountId: id,
    observedAt: observedAt.toISOString(),
    followers: metrics.followers,
    source: 'provider',
    posts: [],
    cities: [],
    ages: [],
  });
  await db.socialAccount.update({
    where: { id },
    data: { ...metrics, connectionState: 'connected', lastSyncedAt: observedAt },
  });
}
