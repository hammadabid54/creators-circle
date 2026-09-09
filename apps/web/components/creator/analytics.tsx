'use client';
import { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import type { MetricSnapshot } from '@/lib/creator-metrics';
type Account = {
  id: string;
  platform: string;
  followers: number;
  engagementRate: number | null;
  lastSyncedAt: string | null;
  connectionState: string;
};
const format = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-40 flex flex-col justify-center items-center text-center rounded-lg bg-[#f7f4f1] border border-dashed border-anjuman-line p-6">
      <BarChart3 size={23} className="text-anjuman-purple mb-3" />
      <p className="text-sm cc-subtle max-w-xs">{children}</p>
    </div>
  );
}
function Bars({
  rows,
  percent = false,
}: {
  rows: { label: string; value: number }[];
  percent?: boolean;
}) {
  const max = percent ? 100 : Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-4">
      {rows.map((row, i) => (
        <li key={row.label + i}>
          <div className="flex justify-between gap-3 text-sm mb-2">
            <span className="truncate">{row.label}</span>
            <strong className="font-medium">
              {percent ? row.value.toFixed(1) + '%' : format(row.value)}
            </strong>
          </div>
          <div className="h-2 rounded-full bg-[#eee7eb]" aria-hidden="true">
            <div
              className="h-full rounded-full bg-anjuman-purple"
              style={{ width: (100 * row.value) / max + '%' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
export function CreatorAnalytics({
  accounts,
  history,
}: {
  accounts: Account[];
  history: MetricSnapshot[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [days, setDays] = useState(30);
  const account = accounts.find((a) => a.id === accountId);
  const cutoff = Date.now() - days * 86400000;
  const selected = history.filter((s) => s.socialAccountId === accountId);
  const points = selected.filter((s) => +new Date(s.observedAt) >= cutoff);
  const latest = selected.at(-1);
  const demo = account?.connectionState === 'dev_mock';
  const max = Math.max(1, ...points.map((p) => p.followers));
  const min = Math.min(...points.map((p) => p.followers));
  const span = Math.max(1, max - min);
  const start = points[0];
  const end = points.at(-1);
  const coordinates = points
    .map(
      (p) =>
        `${32 + ((+new Date(p.observedAt) - (start ? +new Date(start.observedAt) : 0)) / Math.max(1, (end ? +new Date(end.observedAt) : 0) - (start ? +new Date(start.observedAt) : 0))) * 536},${150 - ((p.followers - min) / span) * 116}`,
    )
    .join(' ');
  const updated = latest?.observedAt || account?.lastSyncedAt;
  return (
    <section id="performance" className="mt-10 scroll-mt-24" aria-labelledby="analytics-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="cc-eyebrow mb-2">Beyond the numbers</p>
          <h2 id="analytics-heading" className="text-2xl font-semibold">
            Audience &amp; performance.
          </h2>
        </div>
        {accounts.length > 0 && (
          <label className="text-xs cc-subtle">
            Platform
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="cc-field mt-1 capitalize"
              aria-label="Analytics platform"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.platform}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs cc-subtle mb-5" role="status">
        {account
          ? `${account.platform} · ${demo ? 'Demonstration metrics — not verified performance' : latest ? 'Source: connected platform' : 'Profile snapshot — historical measurements not collected'}`
          : 'No social platforms connected'}
        {updated
          ? ' · Last recorded ' +
            new Date(updated).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })
          : ' · No successful measurement recorded'}
      </p>
      {account && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="cc-panel p-5">
            <p className="text-xs cc-subtle">
              {account.platform === 'youtube' ? 'Subscribers' : 'Followers'}
              {demo ? ' · Demo' : ''}
            </p>
            <p className="text-3xl font-medium mt-2">
              {format(latest?.followers ?? account.followers)}
            </p>
          </div>
          <div className="cc-panel p-5">
            <p className="text-xs cc-subtle">Profile engagement rate{demo ? ' · Demo' : ''}</p>
            <p className="text-3xl font-medium mt-2">
              {account.engagementRate === null ? '—' : account.engagementRate.toFixed(1) + '%'}
            </p>
            <p className="text-xs cc-subtle mt-2">
              {account.engagementRate === null
                ? 'Not measured yet'
                : 'Provider definitions may differ.'}
            </p>
          </div>
        </div>
      )}
      <div className="cc-panel p-5 md:p-6 mb-5">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp size={17} />
            Follower growth
          </h3>
          <div className="flex border border-anjuman-line rounded-lg p-1">
            {[30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={
                  'px-3 py-2 text-xs rounded ' + (days === d ? 'bg-anjuman-purple text-white' : '')
                }
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
        {points.length >= 2 && !demo ? (
          <>
            <p className="text-sm cc-subtle mb-3">
              {format(start!.followers)} → {format(end!.followers)} across {points.length}{' '}
              observations. Scale: {format(min)}–{format(max)} followers.
            </p>
            <svg
              viewBox="0 0 600 190"
              className="w-full"
              role="img"
              aria-label={`Follower growth from ${start!.followers} to ${end!.followers}. Exact dated observations are listed below.`}
            >
              <line x1="32" y1="150" x2="568" y2="150" stroke="#e5dce1" />
              <polyline
                points={coordinates}
                fill="none"
                stroke="#582d46"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {points.map((p, i) => {
                const [cx, cy] = coordinates.split(' ')[i]!.split(',');
                return (
                  <circle key={p.observedAt} cx={cx} cy={cy} r="4" fill="#582d46">
                    <title>
                      {new Date(p.observedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' }) +
                        ': ' +
                        p.followers}
                    </title>
                  </circle>
                );
              })}
              <text x="32" y="182" fill="#706670" fontSize="12">
                {new Date(start!.observedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
              </text>
              <text x="568" y="182" textAnchor="end" fill="#706670" fontSize="12">
                {new Date(end!.observedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
              </text>
            </svg>
            <details className="text-xs mt-3">
              <summary className="cursor-pointer cc-link">View measurements</summary>
              <table className="w-full mt-3 text-left">
                <caption className="sr-only">Dated follower observations</caption>
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>Followers</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.observedAt}>
                      <td className="py-2">
                        {new Date(p.observedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                      </td>
                      <td>{p.followers.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <Empty>
            {demo
              ? 'Growth is unavailable for demonstration accounts.'
              : `Not enough data yet. At least two measured observations in the last ${days} days are needed to show a trend.`}
          </Empty>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <article className="cc-panel p-5">
          <h3 className="font-semibold mb-2">Recent content</h3>
          <p className="text-xs cc-subtle mb-5">
            Views per measured post · {account?.platform || 'No platform'}
          </p>
          {latest?.posts.length && !demo ? (
            <Bars rows={latest.posts.map((p) => ({ label: p.label, value: p.views }))} />
          ) : (
            <Empty>Post-level insights haven&apos;t been collected yet.</Empty>
          )}
        </article>
        <article className="cc-panel p-5">
          <h3 className="font-semibold mb-2">Audience location</h3>
          <p className="text-xs cc-subtle mb-5">
            Share of audience by city · {account?.platform || 'No platform'}
          </p>
          {latest?.cities.length && !demo ? (
            <Bars rows={latest.cities} percent />
          ) : (
            <Empty>City percentages aren&apos;t available from this connection yet.</Empty>
          )}
        </article>
        <article className="cc-panel p-5 sm:col-span-2">
          <h3 className="font-semibold mb-2">Audience age</h3>
          <p className="text-xs cc-subtle mb-5">
            Age distribution · {account?.platform || 'No platform'}
          </p>
          {latest?.ages.length && !demo ? (
            <Bars rows={latest.ages} percent />
          ) : (
            <Empty>
              Demographics will appear when the platform provides sufficient audience data and
              permission.
            </Empty>
          )}
        </article>
      </div>
      <p className="text-xs cc-subtle mt-4">
        Missing data is not zero. Charts use recorded observations; audiences may overlap between
        platforms.
      </p>
    </section>
  );
}
