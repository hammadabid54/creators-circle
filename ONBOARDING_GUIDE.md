# Creators Circle onboarding guide

## Sign-in and account identity

1. Open `/signin` and choose Email (default) or Phone. Both creators and brands use the same sign-in page; first-time sign-in also creates the account.
2. Email accepts a valid address, trims surrounding spaces and treats letter case consistently. Phone accepts Pakistani mobile numbers, including +92 and local 03 formats.
3. Enter the six-digit code. Codes expire after five minutes, can be consumed once and lock after five incorrect guesses. Requests have a 60-second cooldown and a three-per-address hourly limit. Stored codes are HMAC-protected, not plaintext. These are address-level controls; a production gateway/IP abuse policy remains necessary.
4. New accounts choose Creator or Brand. The choice is saved server-side and cannot be changed through the client or role picker. These are separate roles, not a combined agency/creator switcher.
5. Role selection creates the role's initial profile and opens its onboarding form. Returning users normally reach their dashboard; sign-in links can preserve a specific internal destination.

### Existing phone accounts

Sign in using the existing phone number, open **Account settings**, choose **Add email sign-in**, and verify the email code. This keeps the same account ID, profile, campaigns and conversations. A linking code is bound to the signed-in account and cannot be used as a login code or to link another account. An email already assigned to another account cannot be linked. Accounts are never merged based on names or profile details.

New email users do not need a phone number. Adding a phone to an email account, replacing an existing email, merging duplicate accounts and assisted recovery are not implemented. Email and phone are private account fields, not public creator-profile fields.

## Creator onboarding

| Section | Fields and behavior |
|---|---|
| 1. Introduction | Display name is required (2–100 characters). Optional bio up to 500 characters, public image URL, and availability toggle. |
| 2. Platforms | Optional connections for Instagram, YouTube, TikTok and Facebook. Connections are separate from basic profile saving. YouTube supports identity/subscriber measurements; Meta/TikTok live connections remain unavailable. Users may continue without connecting. |
| 3. Your interests | At least one niche (up to five), one content language (up to five), and a creator city are required. Managed taxonomy supplies the choices. City describes where the creator is based, not audience location. |
| 4. Services & work | Optional post, story, reel, YouTube video and YouTube Short starting rates in whole PKR. Zero is accepted; blank means no listed rate. Up to six portfolio items: image, video or link, public HTTP(S) URL, optional caption up to 200 characters. |
| Save | Validates required details and saves profile, rates and portfolio together. Existing social credentials are preserved. The creator returns to their dashboard and can edit the same sections later. |

Creator drafts are saved in the current browser tab, keyed to the user. They survive refresh and provider redirects in that tab but are not cross-device drafts. Portfolio and profile images use public URLs; file upload is not implemented. A missing biography or platform connection does not prevent saving a basic profile. Discovery indexing has a separate completeness check; profile creation alone does not promise search-engine inclusion.

The creator dashboard provides profile-completeness prompts, campaign opportunities, applications, profile editing, messages and account settings. Creators can browse campaigns and submit a proposal with a rate, pitch and optional timeline. Accepted proposals open a contract conversation. Deliverable submission, revisions, payments and real-time incoming messages remain outside the completed workflow.

## Brand onboarding

| Field | Requirement |
|---|---|
| Company name | Required; 1–100 characters after trimming. |
| Industry | Optional selection. |
| City | Optional selection. |
| Website | Optional URL. |
| National Tax Number | Optional; shown under expandable business details, maximum 20 characters. No tax-number verification is performed. |
| Monthly creator budget | Optional range; a preference rather than a spending commitment. |
| Preferred creator niches | Optional targeting interests. |

Saving creates or updates the brand profile and returns to the brand dashboard. This form retains edits while open but does not currently persist an unsaved draft after a refresh. The initial role-selection placeholder company is not evidence that onboarding is complete. Completing onboarding is not a KYC or business-verification process.

The brand dashboard includes campaigns, proposal review, creator discovery, messages, brand profile and account settings. To publish a campaign, provide a title (3–120 characters), brief (10–2,000), 1–5 niches, 1–4 platforms, minimum/maximum whole-PKR budgets and at least one deliverable. Deliverables support post/story/reel/YouTube video/Short, quantity 1–20. Cities and timeline are optional. Campaign drafts are local to the tab. Only the owning brand can accept or reject proposals; acceptance creates the contract conversation.

## Email delivery setup

- `RESEND_API_KEY`: server-only delivery key.
- `EMAIL_FROM`: sender authorized on the delivery account.
- `EMAIL_PREVIEW_MODE=true`: displays a local test code only when the server runs in development. Production ignores this setting.
- `AUTH_URL` and `NEXTAUTH_URL`: use the actual application origin and port. The local production preview uses port 3100; isolated QA uses 3101.

The adapter uses the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email). A provider rejection or missing configuration returns a clear error instead of claiming delivery. No real email or SMS was sent during QA. Live inbox delivery still needs credentials and an authorized sender. Production SMS delivery remains unimplemented.

## What onboarding does not collect

No passwords, identity documents, banking details, payment cards or audience-demographic estimates are requested. No automatic KYC, payout activation, provider verification, account merging or permission to represent a brand is implied by completing these forms.

For a repeatable local production preview, run npm run preview from apps/web after building. This command pins both authentication origins to http://localhost:3100.

## Delivery workflow update
The delivery stage is now implemented: open the accepted collaboration in Messages, submit work links, request revisions with feedback, and approve deliverables. Version history is preserved and all milestones must be approved for completion. See DELIVERY_UPDATE.md. Payment and binary file-upload integrations remain outside this feature.
