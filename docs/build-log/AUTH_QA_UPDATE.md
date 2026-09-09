# Authenticated QA and email sign-in — September 9, 2026

## Implemented

- Email one-time-code sign-in alongside existing phone sign-in, with normalized identifiers and verified-email timestamps.
- Existing phone users can verify an email in Account settings and retain the same profile. Linking challenges are bound to the authenticated user and cannot be consumed as login challenges.
- Resend email-delivery adapter with timeout and explicit failures; preview codes require development mode and EMAIL_PREVIEW_MODE=true. No real email was sent.
- Private account settings for creator and brand workspaces; protected account and message routes.
- Onboarding copy explains role permanence and required/optional details. Full field reference in ONBOARDING_GUIDE.md.
- Exact proposal rates on brand review and creator application screens. A PKR 2,500 proposal previously appeared as PKR 3K because of compact rounding; stored values were correct.
- Preview authentication origin corrected to port 3100 for the running server. Deployment must set its own AUTH_URL/NEXTAUTH_URL.

## Automated evidence

31 isolated authentication/security/workflow checks plus 11 discovery checks passed (42 total). Coverage includes email normalization, verified account creation without phone, mixed-case existing accounts, expiry, incorrect guesses, one-time consumption, challenge binding, sender failures, production preview denial, role selection and escalation prevention, unauthenticated access, creator/brand profile persistence, campaign permissions, duplicate applications, contract acceptance and two-way messaging. Discovery uses 10,050 synthetic profiles. The production build passed including lint and type validation.

## Browser evidence

An isolated SQLite database and development server on port 3101 were used; no existing real user profiles were edited.

- Brand email sign-in and returning sign-in: passed.
- Brand dashboard and profile edit/save: passed.
- Campaign creation and published detail page: passed.
- Existing creator phone sign-in: passed.
- Creator email linking and subsequent email sign-in: passed; original user ID, phone and profile retained.
- Creator profile edit/save and campaign application: passed.
- Brand review and acceptance: passed.
- Brand message, creator reads it and replies: passed.
- Mobile conversation layout at 390px: inspected; both messages and composer visible without layout breakage.
- Creator access to admin management: denied with 404 as intended.
- Database assertions: accepted application, exact PKR 2,500, one contract and two browser messages.
- Production preview /signin returns 200; unauthenticated /account, /brand/dashboard and /messages redirect to sign-in on the same preview origin.

## Still not a production launch sign-off

Live inbox delivery needs a configured sender and credentials. SMS delivery, Meta/TikTok integrations, full analytics ingestion, payments, delivery/revision workflows, account recovery/change-email/phone-linking and real-time incoming messages are not complete. Full screen-reader auditing, production concurrency, infrastructure security, backup restore and live provider tests remain outstanding. Address-level OTP throttling does not replace persistent gateway/IP abuse controls.

New-user role creation and role locking have automated coverage; not every new-user browser path, optional-field combination or network failure has exhaustive browser coverage. Brand unsaved profile edits are not persisted after refresh; creator/campaign drafts are tab-local. Existing CI configuration has not been executed on a remote runner.

## Additional admin fix
Browser QA found that navigating between landing-page editors could retain stale select values. Forms now remount for each selected page/category to preserve the intended filters.

Admin sign-in and landing-page editing passed in the browser. Saving preserved the Fashion filter, published state and noindex state; database assertions confirmed all three. The corrected editor also resets after saving.

The admin indexing guard correctly rejected approval with insufficient complete profiles and short editorial copy. Final production build passed after the admin form fix.

Final mobile sign-in review completed; email/phone switch buttons now use consistent spacing and styling. The production email endpoint returns an explicit 503 with no preview code while sender credentials are absent.
