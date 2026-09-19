const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const env = { NODE_ENV: 'production', AUTH_URL: 'https://kollabo.pk' };
const stored = new Map();
const jar = {
  set(name, value, options) { stored.set(name, { value, options }); },
  get(name) { return stored.get(name); },
  delete(name) { stored.delete(name); },
};
const cache = new Map();
const redirect = url => ({ location: String(url) });
function load(file) {
  file = path.resolve(__dirname, file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = id => {
    if (id === 'next/headers') return { cookies: async () => jar };
    if (id === 'next/server') return { NextResponse: { redirect, next: () => ({ next: true }) } };
    if (id === 'next-auth') return { default: () => ({ auth: fn => req => fn(req) }) };
    if (id === '@/lib/auth.config') return { authConfig: {} };
    if (id === '@/lib/auth') return { auth: async () => ({ user: { id: 'creator', role: 'creator' } }) };
    if (id === '@/lib/db') return { db: {} };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    if (id.startsWith('.')) return load(path.relative(__dirname, path.resolve(path.dirname(file), id + '.ts')));
    return require(id);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, process: { env }, URL, URLSearchParams, console, Date });
  return module.exports;
}

(async () => {
  const urls = load('lib/app-url.ts');
  assert.equal(urls.appUrl('/creator/onboarding').href, 'https://kollabo.pk/creator/onboarding');
  delete env.AUTH_URL;
  env.NEXTAUTH_URL = 'https://kollabo.pk/';
  assert.equal(load('lib/social-providers.ts').redirectUri('meta'), 'https://kollabo.pk/api/social/meta/callback');
  delete env.NEXTAUTH_URL;
  assert.throws(() => urls.appOrigin(), /public application URL/);
  env.AUTH_URL = 'https://kollabo.pk';

  const { issueState, consumeState } = load('lib/oauth-state.ts');
  const first = await issueState('meta', '/creator/onboarding', false);
  const second = await issueState('meta', '/creator/onboarding', false);
  const third = await issueState('youtube', '/creator/onboarding', false);
  for (const cookie of stored.values()) {
    assert.equal(cookie.options.secure, true);
    assert.equal(cookie.options.httpOnly, true);
    assert.equal(cookie.options.sameSite, 'lax');
  }
  assert.equal(await consumeState('bad-state'), null);
  assert.equal(await consumeState('x'.repeat(32)), null);
  assert.equal((await consumeState(first)).provider, 'meta');
  assert.equal(await consumeState(first), null, 'replays must fail');
  assert.equal((await consumeState(second)).provider, 'meta', 'another attempt must survive');
  assert.equal((await consumeState(third)).provider, 'youtube');
  const expired = await issueState('meta', '/', false);
  const cookie = stored.get('anj_oauth_state_' + expired);
  cookie.value = JSON.stringify({ ...JSON.parse(cookie.value), expiresAt: 1 });
  assert.equal(await consumeState(expired), null);

  const callback = load('app/api/social/meta/callback/route.ts');
  const result = await callback.GET(new Request('http://localhost:3001/api/social/meta/callback?state=' + first + '&code=test'));
  assert.equal(result.location, 'https://kollabo.pk/creator/onboarding?error=invalid_state');
  const middleware = load('middleware.ts').default;
  const req = { headers: new Headers({ host: 'www.kollabo.pk' }), nextUrl: new URL('https://www.kollabo.pk/api/social/meta/start?returnTo=/creator/onboarding') };
  assert.equal(middleware(req, {}).location, 'https://kollabo.pk/api/social/meta/start?returnTo=/creator/onboarding');
  console.log('PASS: public redirects, canonical host, concurrent attempts, expiry, missing state and replay rejection');
})().catch(error => { console.error(error); process.exitCode = 1; });
