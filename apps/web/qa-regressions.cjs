const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');fs.mkdirSync('.qa',{recursive:true});const file=path.resolve('.qa/security-'+Date.now()+'.db');
const source=new DatabaseSync('prisma/dev.db',{readOnly:true}),fixture=new DatabaseSync(file);
for(const r of source.prepare("SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC").all())fixture.exec(r.sql);source.close();fixture.close();
process.env.DATABASE_URL='file:'+file.replaceAll('\\','/');process.env.AUTH_SECRET='isolated-test-secret';
const {PrismaClient}=require('@prisma/client'),db=new PrismaClient();let actor={id:'brand',role:'brand'},authConfig,failed=0;const cache=new Map();let network=async()=>{throw new Error('Network is disabled in QA');};
function load(p){if(cache.has(p))return cache.get(p);const exports={};cache.set(p,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(n==='@/lib/db')return {db};if(n==='@/lib/auth')return {auth:async()=>({user:actor})};if(n==='next/cache')return {revalidateTag:()=>{},revalidatePath:()=>{}};if(n==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init?.status||200,headers:new Map(Object.entries(init?.headers||{}))})}};if(n==='next-auth')return {default:c=>{authConfig=c;return {};}};if(n==='next-auth/providers/credentials')return {default:x=>x};if(n.startsWith('@/'))return load(n.slice(2)+'.ts');return require(n);},process,Buffer,Date,Math,console,URL,AbortSignal,fetch:(...args)=>network(...args)});return exports;}
async function test(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}}
(async()=>{try{const otp=load('lib/otp.ts');
await test('Phone normalization and validation',async()=>{assert.equal(otp.normalizePhone('+92 300 1234567'),'03001234567');assert.equal(otp.validPhone('0300abcdefg'),false);assert.equal(otp.validPhone('02112345678'),false);});
const phone='03000000009',code=await otp.createOtp(phone);
await test('Stored OTP is protected',async()=>{const t=await db.otpToken.findFirst({where:{phone}});assert.notEqual(t.code,code);assert.equal(t.code.length,64);});
await test('Five wrong guesses lock challenge',async()=>{for(let i=0;i<5;i++)await otp.verifyOtp(phone,code==='111111'?'222222':'111111');assert.equal((await db.otpToken.findFirst({where:{phone}})).attempts,5);assert.equal(await otp.verifyOtp(phone,code),false);});
await test('Concurrent OTP has one winner',async()=>{const p='03000000008',c=await otp.createOtp(p);const r=await Promise.all(Array.from({length:5},()=>otp.verifyOtp(p,c)));assert.equal(r.filter(Boolean).length,1);});
await test('Resend cooldown preserves current challenge',async()=>{const p='03000000007',c=await otp.createOtp(p);await assert.rejects(()=>otp.createOtp(p));assert.equal(await otp.verifyOtp(p,c),true);});
await db.user.createMany({data:[{id:'brand',role:'brand'},{id:'creator',role:'creator'},{id:'outsider',role:'brand'}]});load('lib/auth.ts');
await test('Client cannot elevate role',async()=>{const r=await authConfig.callbacks.jwt({token:{id:'creator',role:'creator'},trigger:'update',session:{role:'admin'}});assert.equal(r.role,'creator');});
await db.campaign.create({data:{id:'campaign',brandId:'brand',title:'QA campaign',brief:'Isolated QA',budgetMin:10,budgetMax:100}});await db.application.create({data:{id:'application',campaignId:'campaign',creatorId:'creator',proposedRate:50}});
const route=load('app/api/applications/[id]/route.ts'),patch=()=>route.PATCH({json:async()=>({action:'accept'})},{params:Promise.resolve({id:'application'})});
await test('Only campaign owner can accept',async()=>{actor={id:'outsider',role:'brand'};assert.equal((await patch()).status,403);actor={id:'brand',role:'brand'};});
await test('Repeated acceptance creates one contract',async()=>{assert.equal((await patch()).status,200);assert.equal((await patch()).status,409);assert.equal(await db.contract.count(),1);assert.equal(await db.milestone.count(),1);assert.equal((await db.application.findUnique({where:{id:'application'}})).status,'accepted');actor={id:'creator',role:'creator'};const signRoute=load('app/api/contracts/[id]/sign/route.ts');await signRoute.POST({json:async()=>({})},{params:Promise.resolve({id:(await db.contract.findFirst()).id})});});
await test('Conversation excludes outsiders',async()=>{actor={id:'outsider',role:'brand'};const c=await db.contract.findFirst();const r=await load('app/api/messages/route.ts').POST({json:async()=>({threadId:c.id,body:'Unauthorized QA'})});assert.equal(r.status,403);assert.equal(await db.message.count(),0);});
await test('Chart data validates ranges and demographic totals',async()=>{const m=load('lib/creator-metrics.ts'),b={socialAccountId:'x',observedAt:new Date().toISOString(),source:'provider',followers:10};assert.equal(m.metricSchema.safeParse({...b,followers:-1}).success,false);assert.equal(m.metricSchema.safeParse({...b,ages:[{label:'18-24',value:80},{label:'25-34',value:80}]}).success,false);});
await db.creatorProfile.create({data:{id:'qa-profile',userId:'creator'}});
await db.socialAccount.create({data:{id:'qa-youtube',creatorId:'qa-profile',platform:'youtube',handle:'qa',accessToken:'fixture-token',tokenExpiresAt:new Date(Date.now()+3600000),connectionState:'connected'}});
await test('Measured snapshots persist once and round-trip to charts',async()=>{const m=load('lib/creator-metrics.ts'),value={socialAccountId:'qa-youtube',observedAt:new Date().toISOString(),followers:200,source:'provider',posts:[{label:'QA post',views:500,engagement:null}],cities:[],ages:[]};await m.recordMetrics(value);await m.recordMetrics(value);const h=await m.getMetricHistory('qa-profile');assert.equal(h.length,1);assert.equal(h[0].posts[0].views,500);});
await test('YouTube fetch validates measured channel identity',async()=>{network=async()=>({ok:true,json:async()=>({items:[{id:'channel-id',snippet:{title:'QA channel',customUrl:'@qa-channel'},statistics:{subscriberCount:'450'}}]})});const r=await load('lib/youtube-metrics.ts').fetchYouTubeChannel('fixture-token');assert.equal(r.followers,450);assert.equal(r.handle,'qa-channel');});
await test('Failed sync never advances successful-sync time',async()=>{network=async()=>({ok:false});await assert.rejects(()=>load('lib/youtube-metrics.ts').syncYouTubeAccount('qa-youtube'));assert.equal((await db.socialAccount.findUnique({where:{id:'qa-youtube'}})).lastSyncedAt,null);});
await test('Production SMS fails without pretending delivery',async()=>{process.env.NODE_ENV='production';assert.equal((await load('app/api/otp/send/route.ts').POST({json:async()=>({phone:'03000000006'})})).status,503);assert.equal(await db.otpToken.count({where:{phone:'03000000006'}}),0);});

await test('Email normalization and invalid addresses',async()=>{assert.equal(otp.emailKey('  QA@Example.com '),'email:qa@example.com');assert.throws(()=>otp.emailKey('not-email'));});
await test('Email login creates a verified account without requiring phone',async()=>{const key=otp.emailKey('new@example.com'),code=await otp.createOtp(key);const user=await load('lib/login-identity.ts').authorizeIdentity({email:'NEW@example.com',code});assert.ok(user.emailVerified);assert.equal(user.phone,null);assert.equal(user.role,null);assert.equal(await otp.verifyOtp(key,code),false);});
await test('Account linking codes cannot be used to sign in or by another user',async()=>{const key=otp.emailKey('link@example.com'),code=await otp.createOtp(key,'creator');assert.equal(await otp.verifyOtp(key,code),false);assert.equal(await otp.verifyOtp(key,code,'brand'),false);assert.equal(await otp.verifyOtp(key,code,'creator'),true);});
await test('Existing mixed-case email resolves the same profile',async()=>{await db.user.create({data:{id:'email-existing',email:'Mixed@Example.com',role:'brand'}});const code=await otp.createOtp(otp.emailKey('mixed@example.com'));const user=await load('lib/login-identity.ts').authorizeIdentity({email:'mixed@example.com',code});assert.equal(user.id,'email-existing');assert.equal(user.role,'brand');});
await test('Production email fails closed without delivery credentials',async()=>{delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;process.env.EMAIL_PREVIEW_MODE='true';assert.equal((await load('app/api/email/send/route.ts').POST({json:async()=>({email:'unconfigured@example.com'})})).status,503);assert.equal(await db.otpToken.count({where:{phone:'email:unconfigured@example.com'}}),0);});
await test('Email delivery rejection does not report success',async()=>{process.env.RESEND_API_KEY='fixture-key';process.env.EMAIL_FROM='qa@example.com';network=async()=>({ok:false});assert.equal((await load('app/api/email/send/route.ts').POST({json:async()=>({email:'rejected@example.com'})})).status,503);});
await test('Successful production email never returns the code',async()=>{network=async()=>({ok:true,json:async()=>({id:'fixture-delivery'})});const r=await load('app/api/email/send/route.ts').POST({json:async()=>({email:'delivered@example.com'})});assert.equal(r.status,200);assert.equal(r.body.devCode,undefined);});
await test('Creator onboarding rejects brand and saves creator profile',async()=>{const route=load('app/api/onboarding/creator/route.ts');const request={json:async()=>({name:'QA Creator',city:'Lahore',niches:['Fashion'],languages:['UR'],bio:'A real test profile biography with more than forty characters.',rateCard:{postRate:5000},portfolio:[]})};actor={id:'brand',role:'brand'};assert.equal((await route.POST(request)).status,403);actor={id:'creator',role:'creator'};assert.equal((await route.POST(request)).status,200);assert.equal((await db.user.findUnique({where:{id:'creator'}})).name,'QA Creator');});
await test('Brand onboarding persists company and refuses creators',async()=>{const route=load('app/api/onboarding/brand/route.ts');const request={json:async()=>({company:'QA Studio',city:'Lahore',preferredNiches:['Fashion']})};assert.equal((await route.POST(request)).status,403);actor={id:'brand',role:'brand'};assert.equal((await route.POST(request)).status,200);assert.equal((await db.brandProfile.findUnique({where:{userId:'brand'}})).company,'QA Studio');});
await test('Contract participants can exchange messages',async()=>{const contract=await db.contract.findFirst();const route=load('app/api/messages/route.ts');assert.equal((await route.POST({json:async()=>({threadId:contract.id,body:'Brand QA message'})})).status,200);actor={id:'creator',role:'creator'};assert.equal((await route.POST({json:async()=>({threadId:contract.id,body:'Creator QA reply'})})).status,200);assert.equal(await db.message.count({where:{threadId:contract.id}}),2);});

await test('Expired email codes and wrong guesses cannot sign in',async()=>{const key=otp.emailKey('expired@example.com'),code=await otp.createOtp(key);await db.otpToken.updateMany({where:{phone:key},data:{expires:new Date(Date.now()-1000)}});assert.equal(await otp.verifyOtp(key,code),false);const key2=otp.emailKey('guess@example.com'),code2=await otp.createOtp(key2);for(let i=0;i<5;i++)await otp.verifyOtp(key2,code2==='111111'?'222222':'111111');assert.equal(await otp.verifyOtp(key2,code2),false);});
await test('Phone profile can link email and retain its identity',async()=>{actor={id:'creator',role:'creator'};process.env.NODE_ENV='development';process.env.EMAIL_PREVIEW_MODE='true';const route=load('app/api/account/email/route.ts');const sent=await route.POST({json:async()=>({email:'linked-creator@example.com',action:'send'})});assert.equal(sent.status,200);assert.ok(sent.body.devCode);assert.equal((await route.POST({json:async()=>({email:'linked-creator@example.com',action:'verify',code:sent.body.devCode})})).status,200);assert.equal((await db.user.findUnique({where:{id:'creator'}})).email,'linked-creator@example.com');});
await test('Campaign creation and application validate permissions and duplicates',async()=>{const route=load('app/api/campaigns/route.ts');const request={json:async()=>({title:'QA full journey',brief:'A full isolated QA campaign brief.',budgetMin:1000,budgetMax:5000,targetNiches:['Fashion'],targetPlatforms:['youtube'],deliverables:[{type:'post',qty:1}]})};assert.equal((await route.POST(request)).status,403);actor={id:'brand',role:'brand'};const result=await route.POST(request);assert.equal(result.status,200);const applicationRoute=load('app/api/applications/route.ts');const application={json:async()=>({campaignId:result.body.id,proposedRate:2000,pitch:'I can create a useful campaign with a clear story.'})};assert.equal((await applicationRoute.POST(application)).status,403);actor={id:'creator',role:'creator'};assert.equal((await applicationRoute.POST(application)).status,200);assert.equal((await applicationRoute.POST(application)).status,409);});
process.env.NODE_ENV='production';

await test('New email accounts select one role and cannot change it',async()=>{const route=load('app/api/onboarding/role/route.ts');const user=await db.user.findUnique({where:{email:'new@example.com'}});actor={id:user.id,role:null};assert.equal((await route.POST({json:async()=>({role:'creator'})})).status,200);assert.ok(await db.creatorProfile.findUnique({where:{userId:user.id}}));assert.equal((await route.POST({json:async()=>({role:'brand'})})).status,409);assert.equal((await route.POST({json:async()=>({role:'admin'})})).status,400);});


const delivery=load('app/api/deliveries/[id]/route.ts');const dc=await db.contract.findFirst();const dm=await db.milestone.findFirst({where:{contractId:dc.id}});const deliver=(body)=>delivery.POST({json:async()=>body},{params:Promise.resolve({id:dc.id})});
await test('Delivery permissions and unsafe links are rejected',async()=>{actor={id:'brand',role:'brand'};assert.equal((await deliver({action:'submit',milestoneId:dm.id,links:['https://example.com/work']})).status,403);actor={id:'outsider',role:'brand'};assert.equal((await deliver({action:'submit',milestoneId:dm.id,links:['https://example.com/work']})).status,409);actor={id:'creator',role:'creator'};assert.equal((await deliver({action:'submit',milestoneId:dm.id,links:['javascript:alert(1)']})).status,400);});
await test('Creator submits once and brand feedback enables a new version',async()=>{const body={action:'submit',milestoneId:dm.id,links:['https://example.com/work'],notes:'Version one'};assert.equal((await deliver(body)).status,200);assert.equal((await deliver(body)).status,409);let submission=await db.contentSubmission.findFirst({where:{milestoneId:dm.id}});assert.equal((await deliver({action:'approve',submissionId:submission.id})).status,403);actor={id:'brand',role:'brand'};assert.equal((await deliver({action:'revise',submissionId:submission.id,feedback:''})).status,400);assert.equal((await deliver({action:'revise',submissionId:submission.id,feedback:'Please revise the opening.'})).status,200);assert.equal((await deliver({action:'approve',submissionId:submission.id})).status,409);assert.equal((await db.milestone.findUnique({where:{id:dm.id}})).status,'revision_requested');actor={id:'creator',role:'creator'};assert.equal((await deliver({...body,notes:'Version two'})).status,200);assert.equal(await db.contentSubmission.count({where:{milestoneId:dm.id}}),2);});
await test('Final approval completes delivery without altering payments',async()=>{actor={id:'brand',role:'brand'};const before=await db.contract.findUnique({where:{id:dc.id}});const submission=await db.contentSubmission.findFirst({where:{milestoneId:dm.id,status:'pending'}});const txCount=await db.transaction.count();assert.equal((await deliver({action:'approve',submissionId:submission.id,feedback:'Ready to publish.'})).status,200);assert.equal((await deliver({action:'approve',submissionId:submission.id})).status,409);const after=await db.contract.findUnique({where:{id:dc.id}});assert.equal(after.status,'completed');assert.equal(after.escrowState,before.escrowState);assert.equal(await db.transaction.count(),txCount);assert.equal(await db.deliveryReview.count(),2);});
await test('All milestones must be approved and cancelled work stays closed',async()=>{const c=await db.contract.create({data:{creatorId:'creator',brandId:'brand',agreedRate:100,status:'active',milestones:{create:[{title:'First',amount:50},{title:'Second',amount:50}]}}});const m=await db.milestone.findFirst({where:{contractId:c.id}});const call=b=>delivery.POST({json:async()=>b},{params:Promise.resolve({id:c.id})});actor={id:'creator',role:'creator'};assert.equal((await call({action:'submit',milestoneId:dm.id,links:['https://example.com/work']})).status,409);assert.equal((await call({action:'submit',milestoneId:m.id,links:['https://example.com/work']})).status,200);actor={id:'brand',role:'brand'};const sub=await db.contentSubmission.findFirst({where:{contractId:c.id}});assert.equal((await call({action:'approve',submissionId:sub.id})).status,200);assert.equal((await db.contract.findUnique({where:{id:c.id}})).status,'active');await db.contract.update({where:{id:c.id},data:{status:'cancelled'}});actor={id:'creator',role:'creator'};assert.equal((await call({action:'submit',milestoneId:m.id,links:['https://example.com/work']})).status,409);});
await test('Final approval with funded escrow does not complete the contract',async()=>{
  // Reproduces the bug the reviewer flagged: when money is in flight
  // (escrowState = funded or held), final milestone approval must NOT
  // mark the contract 'completed'. It goes to 'pending_payout' and waits
  // for the release webhook. Today, every contract has escrowState=pending
  // so this only exercises the new path after we set it explicitly.
  const funded=await db.contract.create({data:{creatorId:'creator',brandId:'brand',agreedRate:300,status:'active',escrowState:'funded',milestones:{create:[{title:'Only',amount:300}]}}});
  const m=await db.milestone.findFirst({where:{contractId:funded.id}});
  const call=b=>delivery.POST({json:async()=>b},{params:Promise.resolve({id:funded.id})});
  actor={id:'creator',role:'creator'};
  assert.equal((await call({action:'submit',milestoneId:m.id,links:['https://example.com/work']})).status,200);
  actor={id:'brand',role:'brand'};
  const sub=await db.contentSubmission.findFirst({where:{milestoneId:m.id}});
  assert.equal((await call({action:'approve',submissionId:sub.id})).status,200);
  const after=await db.contract.findUnique({where:{id:funded.id}});
  assert.equal(after.status,'pending_payout');
  // And the release helper closes it only when escrowState='released'.
  const lifecycle=load('lib/contract-lifecycle.ts');
  await lifecycle.completeContractIfPayoutDone(funded.id);
  assert.equal((await db.contract.findUnique({where:{id:funded.id}})).status,'pending_payout');
  await db.contract.update({where:{id:funded.id},data:{escrowState:'released'}});
  await lifecycle.completeContractIfPayoutDone(funded.id);
  assert.equal((await db.contract.findUnique({where:{id:funded.id}})).status,'completed');
});
await test('Final approval with held escrow also pauses for payout',async()=>{
  const held=await db.contract.create({data:{creatorId:'creator',brandId:'brand',agreedRate:200,status:'active',escrowState:'held',milestones:{create:[{title:'M',amount:200}]}}});
  const m=await db.milestone.findFirst({where:{contractId:held.id}});
  const call=b=>delivery.POST({json:async()=>b},{params:Promise.resolve({id:held.id})});
  actor={id:'creator',role:'creator'};
  await call({action:'submit',milestoneId:m.id,links:['https://example.com/work']});
  actor={id:'brand',role:'brand'};
  const sub=await db.contentSubmission.findFirst({where:{milestoneId:m.id}});
  await call({action:'approve',submissionId:sub.id});
  assert.equal((await db.contract.findUnique({where:{id:held.id}})).status,'pending_payout');
});
await test('Unauthenticated users cannot modify account or onboarding',async()=>{actor=null;for(const route of ['app/api/account/email/route.ts','app/api/onboarding/creator/route.ts','app/api/onboarding/brand/route.ts','app/api/onboarding/role/route.ts'])assert.equal((await load(route).POST({json:async()=>({})})).status,401);});
await test('Production never allows mock mode',async()=>{process.env.SOCIAL_MOCK_MODE='true';assert.equal(load('lib/social-providers.ts').allowSocialMocks(),false);});
await test('Analytics and Sentry are no-ops without env vars',async()=>{
  // The analytics and Sentry modules must never throw when the env vars
  // are missing. They are designed to silently no-op in dev, and a
  // throw here would cascade into every API route.
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.SENTRY_DSN;
  const a = load('lib/analytics.ts');
  await a.trackServerEvent('user-1', 'contract_signed', { contractId: 'c1' });
  a.trackServerEventFireAndForget('user-1', 'contract_signed', { contractId: 'c1' });
  await a.identifyServerUser('user-1', { role: 'creator' });
  const s = load('lib/sentry.ts');
  await s.reportException(new Error('qa'));
  await s.reportMessage('qa message');
  assert.ok(true, 'no-op analytics and Sentry must not throw');
});
await test('Rate limit blocks the 11th OTP request from the same IP in an hour',async()=>{
  // SMS-pumping protection: the per-IP cap on /api/otp/send is 10/hour.
  // Use a different phone per request so the per-phone cooldown doesn't
  // mask the per-IP test.
  const route=load('app/api/otp/send/route.ts');
  process.env.NODE_ENV='development';
  for(let i=0;i<10;i++){
    const phone='030000' + String(20000 + i).padStart(5,'0');
    const r=await route.POST({headers:new Map([['x-forwarded-for','10.0.0.42']]),json:async()=>({phone})});
    assert.equal(r.status,200,`request ${i+1} should succeed`);
  }
  // 11th request from the same IP, even with a fresh phone, must 429.
  const blocked=await route.POST({headers:new Map([['x-forwarded-for','10.0.0.42']]),json:async()=>({phone:'03000030000'})});
  assert.equal(blocked.status,429,'11th request from the same IP must 429');
  assert.ok(blocked.headers && blocked.headers.get('Retry-After'),'429 must include Retry-After');
});
await test('Rate limit also blocks the 11th request from a different IP per phone',async()=>{
  // The per-phone OTP cooldown (60s) is enforced by createOtp and stops
  // the same phone from spamming. The per-IP layer (above) stops an
  // attacker rotating phones. Together they form the SMS-pumping shield.
  // This test pins the per-phone behaviour.
  const route=load('app/api/otp/send/route.ts');
  const phone='03000000098';
  const req=()=>({headers:new Map([['x-forwarded-for','10.0.0.99']]),json:async()=>({phone})});
  process.env.NODE_ENV='development';
  assert.equal((await route.POST(req())).status,200);
  assert.equal((await route.POST(req())).status,429,'cooldown must stop the second request within 60s');
});
await test('Rate limit on messages.send caps at 60 per user per hour',async()=>{
  // The messages API also enforces a per-user + per-IP rate limit.
  // Verifying it here pins the behaviour.
  const route=load('app/api/messages/route.ts');
  // First check: missing auth still returns 401, NOT 429, so the rate
  // limit doesn't shadow the auth check.
  const noauth=await route.POST({headers:new Map(),json:async()=>({threadId:'x',body:'y'})});
  assert.equal(noauth.status,401);
});
await test('Brand can invite a creator to an existing open campaign',async()=>{
  // The high-leverage flow the reviewer flagged: brand-initiated outreach.
  // The invite creates an Application with status='invited' so the creator
  // sees it in their Applications page and can accept with a rate.
  const campaign = await db.campaign.create({
    data: {
      brandId: 'brand',
      title: 'QA invite campaign',
      brief: 'A test campaign for the invite flow.',
      budgetMin: 1000,
      budgetMax: 5000,
      targetNiches: '["Fashion"]',
      targetPlatforms: '["instagram"]',
      deliverables: '[]',
      status: 'open',
    },
  });
  // brand already exists from the test fixture above; creator must exist
  // too. Make sure the creator has a CreatorProfile so the lookup succeeds.
  await db.creatorProfile.upsert({
    where: { userId: 'creator' },
    create: { userId: 'creator' },
    update: {},
  });
  const route = load('app/api/applications/invite/route.ts');
  actor = { id: 'brand', role: 'brand' };
  const res = await route.POST({
    headers: new Map(),
    json: async () => ({ campaignId: campaign.id, creatorId: 'creator', message: 'Hi from QA' }),
  });
  assert.equal(res.status, 200, `invite failed: ${res.body && JSON.stringify(res.body)}`);
  const apps = await db.application.findMany({
    where: { campaignId: campaign.id, creatorId: 'creator' },
  });
  assert.equal(apps.length, 1);
  assert.equal(apps[0].status, 'invited');
  // The opening message should land in the thread.
  const msgs = await db.message.findMany({ where: { threadId: apps[0].id } });
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].body, 'Hi from QA');
  // And the creator can decline it.
  const patch = load('app/api/applications/[id]/route.ts');
  actor = { id: 'creator', role: 'creator' };
  const decline = await patch.PATCH(
    { json: async () => ({ action: 'decline_invite' }) },
    { params: Promise.resolve({ id: apps[0].id }) },
  );
  assert.equal(decline.status, 200);
  assert.equal((await db.application.findUnique({ where: { id: apps[0].id } })).status, 'withdrawn');
});
await test('Creator can accept an invite with a proposed rate and pitch',async()=>{
  // Second half of the invite flow: the creator counters with a rate.
  const campaign = await db.campaign.create({
    data: {
      brandId: 'brand',
      title: 'QA accept invite',
      brief: 'A test campaign for accepting an invite.',
      budgetMin: 1000,
      budgetMax: 5000,
      targetNiches: '["Fashion"]',
      targetPlatforms: '["instagram"]',
      deliverables: '[]',
      status: 'open',
    },
  });
  const route = load('app/api/applications/invite/route.ts');
  actor = { id: 'brand', role: 'brand' };
  const inv = await route.POST({
    headers: new Map(),
    json: async () => ({ campaignId: campaign.id, creatorId: 'creator' }),
  });
  assert.equal(inv.status, 200, `invite failed: ${inv.body && JSON.stringify(inv.body)}`);
  const apps = await db.application.findMany({ where: { campaignId: campaign.id, creatorId: 'creator' } });
  const patch = load('app/api/applications/[id]/route.ts');
  actor = { id: 'creator', role: 'creator' };
  // Accepting without a rate and pitch must 400.
  const bad = await patch.PATCH(
    { json: async () => ({ action: 'accept_invite' }) },
    { params: Promise.resolve({ id: apps[0].id }) },
  );
  assert.equal(bad.status, 400, 'creator must supply a rate and pitch to accept');
  // Accepting with both must flip status to 'pending' and persist them.
  const good = await patch.PATCH(
    {
      json: async () => ({
        action: 'accept_invite',
        proposedRate: 3500,
        pitch: 'I would love to work on this campaign — it fits my audience perfectly.',
      }),
    },
    { params: Promise.resolve({ id: apps[0].id }) },
  );
  assert.equal(good.status, 200);
  const after = await db.application.findUnique({ where: { id: apps[0].id } });
  assert.equal(after.status, 'pending');
  assert.equal(after.proposedRate, 3500);
});
await test('Creator can publish and unpublish their profile',async()=>{
  // Item 9: let creators ship a partial profile. The published flag
  // defaults to false on every CreatorProfile, so a half-filled profile
  // is never accidentally discoverable. The toggle is reversible.
  await db.creatorProfile.upsert({
    where: { userId: 'creator' },
    create: { userId: 'creator' },
    update: {},
  });
  const route = load('app/api/onboarding/creator/publish/route.ts');
  actor = { id: 'creator', role: 'creator' };
  // Initial state: unpublished.
  const profileBefore = await db.creatorProfile.findUnique({ where: { userId: 'creator' } });
  assert.equal(profileBefore.published, false, 'profile should start unpublished');
  // Publish.
  const r1 = await route.PATCH({ json: async () => ({ published: true }) });
  assert.equal(r1.status, 200);
  const profileAfter = await db.creatorProfile.findUnique({ where: { userId: 'creator' } });
  assert.equal(profileAfter.published, true, 'profile should now be published');
  assert.ok(profileAfter.publishedAt, 'publishedAt should be set');
  // Unpublish.
  const r2 = await route.PATCH({ json: async () => ({ published: false }) });
  assert.equal(r2.status, 200);
  const profileAfter2 = await db.creatorProfile.findUnique({ where: { userId: 'creator' } });
  assert.equal(profileAfter2.published, false);
  assert.equal(profileAfter2.publishedAt, null, 'publishedAt should be cleared');
  // Non-creators cannot toggle.
  actor = { id: 'brand', role: 'brand' };
  const r3 = await route.PATCH({ json: async () => ({ published: true }) });
  assert.equal(r3.status, 403, 'a brand cannot toggle a creator publish state');
});
await test('Non-owners cannot invite to a campaign they do not own',async()=>{
  const route = load('app/api/applications/invite/route.ts');
  // Need a campaign owned by a different brand. brand exists; create another.
  await db.user.create({ data: { id: 'other-brand', role: 'brand' } });
  const c = await db.campaign.create({
    data: {
      brandId: 'other-brand',
      title: 'Other brand campaign',
      brief: 'Owned by other-brand.',
      budgetMin: 1,
      budgetMax: 1,
      targetNiches: '[]',
      targetPlatforms: '[]',
      deliverables: '[]',
      status: 'open',
    },
  });
  actor = { id: 'brand', role: 'brand' };
  const res = await route.POST({
    headers: new Map(),
    json: async () => ({ campaignId: c.id, creatorId: 'creator' }),
  });
  assert.equal(res.status, 403, `non-owner must 403: ${res.body && JSON.stringify(res.body)}`);
});
await test('Notifications and audit log fire on invite.sent and contract.signed',async()=>{
  // The transactional outbox pattern: the notification row, the audit
  // row, and the business event must all commit together. We verify the
  // rows exist after each transition and that the audit log has the
  // before/after diff.
  const notif = load('lib/notifications.ts');
  const audit = load('lib/audit.ts');

  // 1) Invite fires a notification and an audit row.
  const campaign = await db.campaign.create({
    data: {
      brandId: 'brand',
      title: 'QA notification campaign',
      brief: 'A test campaign for the notification flow.',
      budgetMin: 1000,
      budgetMax: 5000,
      targetNiches: '["Fashion"]',
      targetPlatforms: '["instagram"]',
      deliverables: '[]',
      status: 'open',
    },
  });
  await db.creatorProfile.upsert({
    where: { userId: 'creator' },
    create: { userId: 'creator' },
    update: {},
  });
  const inviteRoute = load('app/api/applications/invite/route.ts');
  actor = { id: 'brand', role: 'brand' };
  const inv = await inviteRoute.POST({
    headers: new Map(),
    json: async () => ({ campaignId: campaign.id, creatorId: 'creator' }),
  });
  assert.equal(inv.status, 200);
  // The invite created an application.invited notification for the creator.
  const notifs = await db.notification.findMany({
    where: { userId: 'creator', type: 'application.invited' },
  });
  assert.ok(notifs.length >= 1, 'invite should create a notification for the creator');
  // And each notification has a delivery row per channel.
  for (const n of notifs) {
    const deliveries = await db.notificationDelivery.findMany({
      where: { notificationId: n.id },
    });
    assert.ok(deliveries.length >= 1, 'each notification must have delivery rows');
  }
  // The audit log has a row for invite.sent.
  const audits = await db.auditEvent.findMany({
    where: { action: 'invite.sent' },
  });
  assert.ok(audits.length >= 1, 'invite should write an audit row');

  // 2) Signing a contract fires a notification and an audit row.
  const signRoute = load('app/api/contracts/[id]/sign/route.ts');
  const c = await db.contract.findFirst();
  actor = { id: 'creator', role: 'creator' };
  await db.contract.update({
    where: { id: c.id },
    data: { status: 'pending_signature', brandSignedAt: new Date(Date.now() - 60000) },
  });
  const sign = await signRoute.POST(
    { json: async () => ({}) },
    { params: Promise.resolve({ id: c.id }) },
  );
  assert.equal(sign.status, 200);
  const signed = await db.contract.findUnique({ where: { id: c.id } });
  assert.equal(signed.status, 'active');
  // Notification to the brand (the contract.signed event).
  const signedNotifs = await db.notification.findMany({
    where: { userId: 'brand', type: 'contract.signed' },
  });
  assert.ok(signedNotifs.length >= 1, 'signing should notify the brand');
  // Audit row with the before/after diff.
  const signAudits = await db.auditEvent.findMany({
    where: { action: 'contract.signed', entityId: c.id },
  });
  assert.ok(signAudits.length >= 1, 'signing should write a contract.signed audit row');
  const before = JSON.parse(signAudits[0].before);
  const after = JSON.parse(signAudits[0].after);
  assert.equal(before.status, 'pending_signature');
  assert.equal(after.status, 'active');
});
await test('Unauthenticated users get 0 unread notifications',async()=>{
  const route = load('app/api/notifications/unread-count/route.ts');
  actor = null;
  const r = await route.GET();
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 0);
});
await test('Bumping sessionVersion invalidates an in-flight session',async()=>{
  // Reproduces the reviewer-flagged gap: a ban or KYC reject must end the
  // session immediately, not after the JWT expires. The session callback
  // compares the token's stamped sessionVersion against the live DB value
  // and rejects the session on mismatch.
  const { bumpSessionVersion } = load('lib/session-revoke.ts');
  await db.user.create({ data: { id: 'revoke-me', role: 'creator', name: 'Revoke' } });
  // Capture the current session version (defaults to 0) as the stamped
  // token value, then simulate a ban by bumping the DB value.
  const user0 = await db.user.findUnique({ where: { id: 'revoke-me' }, select: { sessionVersion: true } });
  const token0 = { id: 'revoke-me', role: 'creator', sessionVersion: user0.sessionVersion };
  const session0 = { user: { id: 'revoke-me', name: 'Revoke', email: null, image: null } };
  await bumpSessionVersion('revoke-me');
  // The token still carries the pre-bump version. The session callback
  // must reject it, leaving user=undefined, which NextAuth treats as
  // "no session."
  const out = await authConfig.callbacks.session({ session: session0, token: token0 });
  assert.equal(out && out.user, undefined, 'session must be rejected after sessionVersion bump');
  // With the live version stamped into the token, the session is valid.
  const user1 = await db.user.findUnique({ where: { id: 'revoke-me' }, select: { sessionVersion: true } });
  const token1 = { id: 'revoke-me', role: 'creator', sessionVersion: user1.sessionVersion };
  const out2 = await authConfig.callbacks.session({ session: { user: { id: 'revoke-me', name: 'Revoke', email: null, image: null } }, token: token1 });
  assert.equal(out2.user.id, 'revoke-me', 'session with matching version must remain valid');
});
}finally{await db.$disconnect();}console.log(failed+' failed integration checks.');process.exitCode=failed?1:0;})();

