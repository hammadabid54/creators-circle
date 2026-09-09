# Delivery and revision workflow

Implemented locally: creators submit work links and notes from **Messages ? collaboration ? Work & approvals**. Brands can approve a submitted deliverable or request revisions with required written feedback. Each revision is a new, preserved submission version. Both participants can see version history, reviewer feedback, timestamps and current status.

The lifecycle is Awaiting work ? In review ? Changes requested ? In review ? Approved. Only the contract creator can submit; only its brand can review. Repeated submissions/decisions and cross-contract milestone references are rejected. Cancelled/disputed/completed collaborations cannot receive new delivery actions. A contract becomes completed only when every milestone is approved. The existing initial milestone groups the campaign's full deliverables; this change also supports contracts that already have multiple milestones.

Payment handling is unchanged. Delivery actions do not create payment transactions or alter escrow state. Existing pending-funding contracts can use this offline workflow; completion describes work approval only.

A versioned additive SQLite migration (`003_delivery_review.sql`) records immutable approval/revision decisions against submission versions. Apply it before starting updated code on another database; regenerate Prisma Client. No existing production records were used as write-test fixtures.

Validation: production build passed; 35 authentication/workflow checks and 11 discovery checks passed (46 total). New tests cover submitter/reviewer permissions, unsafe URLs, duplicate submissions, required revision feedback, preserved versions, final approval, unchanged escrow/transactions, multiple milestones and closed contracts.

Limits: submissions are HTTP(S) links to externally hosted work, not binary file uploads. Collaborators must grant access on the hosting service. The app does not fetch linked content or certify ownership/quality. Incoming changes appear after refreshing; real-time notifications, deadline editing, partial approvals within a grouped milestone, disputes and payments are not implemented here.

Browser QA passed on isolated data: creator submitted a work link and notes, the brand reviewed and approved it, and the collaboration became completed with both milestones approved. Database checks preserved escrowState=pending and the approval feedback. Mobile delivery history was visually inspected at 390px.
