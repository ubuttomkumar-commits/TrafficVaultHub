# TrafficVaultHub — Universal CPA Network
## Full Production PRD v5.0
### Universal Offer Engine · Publisher Growth · Advertiser Protection · Trust Infrastructure · Premium 3D Experience

**Product:** TrafficVaultHub  
**Product Type:** Multi-tenant CPA/CPL/CPI/CPS/CPV/CPE/CPC/CPM and configurable affiliate marketing platform  
**Frontend:** Existing React + Vite + TypeScript application  
**Backend:** Existing Cloudflare Workers + Hono architecture  
**Database:** Cloudflare D1  
**Supporting Services:** Durable Objects, Queues, R2, KV, Cron Triggers, Turnstile, Cloudflare security controls and GitHub Actions, where appropriate  
**API Convention:** Existing `/api/v1` conventions  
**Primary Goal:** Build a trustworthy, extensible, secure and commercially viable CPA affiliate network that solves real publisher and advertiser problems without rebuilding its core whenever categories, events or payout models change.

**Brand Positioning:** The CPA Network That Shows Its Work.

**Brand Promise:** Every Click Accounted For. Every Decision Explained. Every Valid Payout Tracked.

---

# 1. PRODUCT VISION

TrafficVaultHub must not be a generic affiliate dashboard or merely a visually attractive copy of an existing CPA network.

It must combine:
- Transparent conversion tracking.
- Explainable rejection and reversal decisions.
- Reliable financial accounting.
- Verifiable payout records.
- Flexible offer and payout configuration.
- Fraud-resistant advertiser campaign management.
- Publisher growth and offer discovery.
- Evidence-based verification and compliance.
- Responsive premium fintech and cybersecurity-inspired design.
- Maintainable, testable and observable infrastructure.

Every major feature must solve a specific business problem, reduce operational friction or improve a measurable outcome.

## 1.1 Core business problems

### Publisher problems
- Unexplained rejected conversions.
- Delayed or uncertain payments.
- Missing conversions and broken postbacks.
- Difficulty discovering relevant offers.
- Unexpected campaign pauses and cap changes.
- Poor support and unresolved disputes.
- Unclear verification requirements.
- Misleading payout or performance claims.

### Advertiser problems
- Fake, duplicate or low-quality conversions.
- Budget leakage and overspending.
- Unreliable affiliate traffic.
- Missing or incorrectly configured tracking.
- Inconsistent campaign reporting.
- Limited SubID visibility.
- Difficult publisher qualification.
- Slow compliance and campaign review.
- Poor visibility into campaign health.

### Platform problems
- Duplicate accounts and coordinated abuse.
- Cross-tenant data leakage.
- Incorrect payout calculations.
- Inconsistent financial records.
- Fragile category-specific code.
- Unreliable background processing.
- Manual operational bottlenecks.
- Unsupported production-readiness claims.

## 1.2 Product success principles

1. Server-side truth takes precedence over frontend state.
2. Financial records must be auditable and reconcilable.
3. Verification evidence must not automatically create trust.
4. Risk signals must be explainable and proportionate.
5. Publishers and advertisers must receive actionable explanations.
6. Historical offers and conversions must retain applicable terms.
7. Every privileged decision must be attributable to an authorized actor.
8. Existing working functionality must be preserved.
9. New features must be implemented incrementally and tested.
10. No claim of zero fraud, zero bugs or complete future-proofing is permitted.

---

# 2. NON-NEGOTIABLE EXECUTION RULES

Before editing any file:

1. Inspect the entire relevant repository, including existing documentation and uncommitted changes.
2. Read `STATE.md`, the current PRD, migrations, schema, API routes, authentication, RBAC, tracking, finance, frontend routes, tests, deployment configuration and CI workflows.
3. Map existing features to this specification using an implementation gap matrix.
4. Identify reusable modules and duplicate-system risks.
5. Record the baseline typecheck, test, build, migration and security results.
6. Inspect Git status and preserve unrelated changes.
7. Never delete, reset, overwrite or recreate the application to simplify implementation.
8. Never create duplicate tables, routes, ledger systems or authentication systems when suitable existing components exist.
9. Use additive migrations compatible with the actual deployed schema.
10. Implement small, independently verifiable units.
11. Do not create fake production conversions, earnings, funding balances, approvals, payment proofs or analytics.
12. Keep credentials and private evidence out of client bundles.
13. Run relevant tests after each meaningful implementation unit.
14. Update documentation, `STATE.md`, migration notes and PRD traceability.
15. Do not silently skip failed tests or weaken existing tests to obtain a green result.
16. Commit and push only when explicitly authorized and the repository state is safe.
17. Do not claim implementation, deployment or verification without actual evidence.
18. Document external dependencies, missing credentials, unresolved gaps and residual risks.

If a requirement conflicts with existing security or accounting invariants, investigate the conflict and document the safest implementation before making changes.

---

# 3. UNIVERSAL OFFER CATEGORY SYSTEM

Implement a configurable category and subcategory system.

The category catalog must be database-driven. Frontend components and business logic must not depend on a hard-coded exhaustive category list.

## 3.1 Initial category catalog

### A. Dating & Relationships
- Mainstream Dating
- Adult Dating
- Matchmaking
- Relationship Services
- Dating Applications
- Dating Memberships

### B. Mobile Applications & Software
- Android Apps
- iOS Apps
- Software Downloads
- SaaS
- VPN & Cybersecurity
- Productivity Tools

### C. Gaming & Entertainment
- Mobile Games
- PC Games
- Gaming Subscriptions
- Entertainment Services

### D. E-commerce & Retail
- Physical Products
- Digital Products
- Coupons & Cashback
- Subscription Commerce

### E. Finance & Business
- Business Leads
- Eligible Financial Services
- Accounting & Business Software
- B2B SaaS

### F. Education & Employment
- Online Courses
- Training
- Recruitment Leads
- Career Services

### G. Travel & Hospitality
- Travel Bookings
- Hotels
- Travel Services

### H. Health, Wellness & Lifestyle
- Eligible Healthcare Services
- Wellness Services
- Fitness Applications

### I. Home & Local Services
- Home Improvement Leads
- Local Service Leads
- Professional Services

### J. Media & Content
- Content Subscriptions
- Publishing
- Eligible Creator Tools

### K. Surveys, Research & Rewards
- Market Research
- Surveys
- Eligible Reward Programs

### L. Other
- Custom Approved Category

This catalog is an initial seed, not a permanent limit.

## 3.2 Category management

Authorized administrators must be able to:
- Create categories and subcategories.
- Rename display labels.
- Change descriptions.
- Reorder categories.
- Add nested categories within defined limits.
- Configure risk classifications and compliance requirements.
- Activate or deactivate categories.
- Review category change history.
- Version category policies.
- View the offers affected by a policy change.

Requirements:
- Use stable category IDs or slugs as relationships.
- Enforce unique slugs and valid parent relationships.
- Prevent cycles and invalid nesting.
- Prevent destructive deletion when historical records reference a category.
- Prefer deactivation and archival.
- Preserve historical category and policy references.
- Validate every administrative change on the server.
- Record actor, timestamp, reason and policy version.

Category deactivation must not silently invalidate historical conversions or rewrite existing payout terms.

---

# 4. UNIVERSAL OFFER AND PAYOUT ENGINE

## 4.1 Supported payout models

Support configurable implementations of:

- CPA — Cost Per Action
- CPL — Cost Per Lead
- CPI — Cost Per Install
- CPS — Cost Per Sale
- CPV — Cost Per View
- CPE — Cost Per Engagement
- CPC — Cost Per Click
- CPM — Cost Per Thousand Impressions
- Recurring commission
- Revenue share
- Hybrid commission
- Custom event-based commission

CPV must require an explicitly defined, measurable, legitimate view event. The platform must define eligibility, event authentication, deduplication, attribution and invalid-view rules.

Do not assume that ambiguous abbreviations such as APV or APL have universal meanings. Custom terminology must include an explicit definition, measurable event, validation rules and approval.

## 4.2 Monetary representation

- Store monetary amounts as integer minor units with an explicit ISO 4217 currency code.
- Use integer or precisely controlled decimal arithmetic for calculations.
- Define currency-specific minor-unit handling.
- Validate all currency conversions and rounding rules.
- Never use binary floating-point arithmetic as the authoritative financial calculation method.
- Preserve the original currency and terms for historical transactions.
- Separate display formatting from financial calculation.

## 4.3 Commission rule types

Support applicable combinations of:
- Fixed commission.
- Percentage commission.
- Tiered commission.
- Recurring commission.
- Revenue-share commission.
- Hybrid commission.
- Custom event-based commission.

Every payout rule must define:
- Eligible event.
- Calculation basis.
- Currency.
- Rounding method.
- Applicable limits.
- Effective period.
- Approval requirements.
- Reversal and refund handling.
- Attribution requirements.
- Rule version.
- Required validation.

Percentage commissions must define the exact base amount. Tiered rules must specify boundaries and whether tiers are marginal or retroactive.

Hybrid rules must define how components interact to prevent accidental double payment.

## 4.4 Versioned payout configurations

- Version every published payout configuration.
- Preserve immutable references to the applicable version on conversion records.
- Record changes, effective timestamps and authorized actors.
- Require review for sensitive payout changes.
- Do not silently rewrite historical conversion terms.
- Prevent incompatible configurations from being activated.
- Maintain auditability when offers are paused, resumed or archived.

## 4.5 Financial separation

Maintain clear separation between:
- Advertiser funding.
- Advertiser liabilities.
- Publisher pending earnings.
- Publisher approved earnings.
- Publisher payable balances.
- Platform revenue.
- Fees, refunds and reversals.
- Reserves and authorized holds.
- Actual payouts and payout failures.

Reuse the existing append-only double-entry ledger.

Never create a payable publisher balance from an unverified, duplicate or otherwise ineligible conversion.

Every financial mutation must be idempotent, auditable and reconcilable.

---

# 5. OFFER CONFIGURATION AND LIFECYCLE

Each offer must support:

- Stable offer ID and public identifier.
- Name and description.
- Category and subcategory.
- Advertiser organization and ownership verification.
- Draft, pending review, active, paused, rejected, expired and archived statuses.
- Supported and excluded GEOs.
- Supported languages.
- Eligible audience requirements.
- Devices, operating systems and browsers.
- Allowed and prohibited traffic sources.
- Permitted promotion methods.
- Landing-page and creative requirements.
- Payout model and currency.
- Versioned commission rules.
- Attribution windows.
- Conversion-event definitions.
- Daily, weekly and lifetime caps.
- Budget limits and funding requirements.
- Start and end timestamps.
- Publisher application and approval requirements.
- Compliance restrictions.
- Tracking and postback configuration.
- Review decisions and audit history.
- Version history and authorized changes.

## 5.1 Offer lifecycle

Use validated, server-controlled state transitions.

Examples:
- Draft → Pending Review.
- Pending Review → Active, Rejected or Draft.
- Active → Paused, Expired or Archived.
- Paused → Active, Pending Review or Archived.
- Rejected → Draft, where permitted.
- Expired → Archived.

Restricted categories may require additional approval transitions.

A frontend status change must never independently activate an offer.

## 5.2 Offer readiness checks

Before activation, verify:
- Required fields.
- Advertiser permissions and verification.
- Category policy requirements.
- Payout configuration validity.
- Funding and budget conditions.
- GEO and traffic-source rules.
- Landing-page requirements.
- Tracking integration health.
- Compliance approval.
- Effective start and end dates.

Return clear error codes and actionable explanations when activation is blocked.

---

# 6. PUBLISHER PROBLEM-SOLVING ENGINE

Publisher retention must be earned through transparent financial records, reliable tracking and useful support.

## 6.1 Earnings Center

Display separate, server-derived totals for:
- Pending earnings.
- Approved earnings.
- Payable earnings.
- Paid earnings.
- Reversed amounts.
- Disputed amounts.
- Authorized holds.

Every displayed amount must have a clear definition and reconciliation source.

Provide:
- Conversion-linked earnings history.
- Applicable payout terms.
- Transaction timestamps.
- Payout eligibility rules.
- Payment status.
- Available payout methods.
- Minimum threshold and reserve information where applicable.
- Actual payment references when returned by a real integration.
- Failed payment explanations.
- Downloadable authorized statements.

Do not show pending funds as payable or present an expected payout date as guaranteed.

## 6.2 Explainable conversion decisions

For each conversion the publisher is authorized to view, show:
- Conversion identifier.
- Event type.
- Received timestamp.
- Current status.
- Applicable payout version.
- Review or rejection reason when disclosure is permitted.
- Relevant status history.
- Dispute eligibility.
- Expected next step, where known.

Use standardized reason codes, including:
- Duplicate conversion.
- Invalid event.
- Attribution window expired.
- Ineligible GEO.
- Prohibited traffic source.
- Advertiser validation pending.
- Policy violation.
- Manual review required.
- Reversal or refund.
- Tracking discrepancy.

Only display a reason supported by recorded evidence. Never invent rejection explanations.

Do not disclose exploitable fraud-detection thresholds or private advertiser information.

## 6.3 Conversion Confidence Monitor

Show:
- Received events.
- Authenticated postbacks.
- Pending conversions.
- Approved and rejected conversions.
- Reversals and disputes.
- Delayed events.
- Reconciliation discrepancies.
- Last successful tracking event.
- Tracking latency and error rates.

Use actual timestamps and clear reporting windows.

If data is incomplete, stale or unavailable, say so explicitly.

## 6.4 Smart Offer Discovery

Provide:
- Search by name, category and subcategory.
- GEO filters.
- Device and operating-system filters.
- Payout-model filters.
- Traffic-source filters.
- Language filters.
- Application and approval requirements.
- Offer status and eligibility.
- Restriction and compliance details.

Recommendations may use:
- Publisher-selected preferences.
- Verified traffic attributes.
- Authorized historical performance.
- Offer eligibility.
- Actual tracking health.
- Sufficiently reliable performance data.

Every recommendation must explain its rationale.

Do not fabricate EPC, conversion rates, revenue forecasts, earnings estimates or offer popularity.

## 6.5 Publisher Growth Coach

Provide actionable guidance for:
- Fixing postback configuration.
- Identifying tracking gaps.
- Discovering eligible offers.
- Understanding compliance requirements.
- Reviewing cap-related interruptions.
- Improving incomplete onboarding.
- Understanding verified campaign performance.

Each recommendation must contain:
1. The issue.
2. Supporting evidence.
3. Suggested action.
4. Confidence or data limitation.
5. A safe route to perform the action.

AI may assist with explanations, but must not independently alter financial balances, approve restricted offers or override server-side eligibility.

## 6.6 Publisher Trust Center

Display separate verification dimensions:
- Email.
- Phone.
- Identity, where required.
- Business.
- Domain.
- Website or property ownership.
- Traffic source.
- Historical evidence review.
- Compliance review.

Clearly explain which requirements are complete and which remain outstanding.

A common email provider must not automatically cause rejection.

## 6.7 Disputes and support

Allow publishers to:
- Open a conversion dispute.
- Select a dispute reason.
- Submit permitted evidence.
- View case status.
- Receive authorized reviewer responses.
- Add follow-up information.
- See relevant deadlines and resolution history.

Provide ownership, timestamps, escalation and audit history.

Prevent users from accessing another publisher's cases or private evidence.

## 6.8 Payout transparency

Support:
- Configured payout schedules.
- Minimum thresholds.
- Applicable holds and reserves.
- Payment status tracking.
- Failed-payment handling.
- Reconciliation.
- Authorized payout reports.

Payment status must be synchronized with actual payment-provider responses or verified finance operations.

A screenshot alone is not proof that a payment succeeded.

---

# 7. ADVERTISER PROBLEM-SOLVING ENGINE

## 7.1 Campaign Launch Studio

Provide a guided campaign creation workflow covering:
- Offer name and description.
- Category and subcategory.
- Conversion events.
- Attribution windows.
- GEO and audience eligibility.
- Device and language targeting.
- Allowed and prohibited traffic sources.
- Landing pages and creative assets.
- Payout rules and currency.
- Caps and budgets.
- Funding validation.
- Tracking and postback configuration.
- Publisher application requirements.
- Compliance evidence.
- Campaign start and end dates.

Display a readiness checklist and block activation when mandatory requirements are unmet.

## 7.2 Conversion Quality Shield

Identify suspicious patterns using appropriate combinations of:
- Duplicate events.
- Replayed postbacks.
- Invalid signatures.
- Abnormal event velocity.
- Repeated or inconsistent event sequences.
- Unusual source-level conversion patterns.
- Inconsistent campaign and attribution data.
- Authorized device and network risk signals.
- Reconciliation discrepancies.

Use risk scores to prioritize investigation, not as automatic proof of fraud.

Apply configurable controls:
- Additional validation.
- Temporary review.
- Conversion holds.
- Source restrictions.
- Rate limits.
- Campaign pauses.
- Escalation to authorized staff.

Provide evidence-backed decisions and an appeal workflow.

Do not automatically punish legitimate users merely because they share an IP address, device or network.

## 7.3 Live Campaign Health

Display:
- Campaign status.
- Last successful postback.
- Postback acceptance and rejection rates.
- Tracking errors.
- Queue failures.
- Remaining caps and budgets.
- Conversion approval and reversal trends.
- Integration status.
- Reconciliation exceptions.
- Compliance warnings.

Use timestamps, defined metric windows and clear alert severity.

Do not report a system as healthy solely because a dashboard page loads.

## 7.4 Advertiser Spend Protection

- Enforce campaign caps on the server.
- Reserve or account for budget exposure before authorizing new payable events where required.
- Use concurrency-safe cap enforcement.
- Prevent spending beyond authoritative limits.
- Pause campaigns when configured limits are reached.
- Make pause and resume operations idempotent.
- Audit funding and budget changes.
- Reconcile campaign activity against advertiser funding and recorded liabilities.
- Define behavior when D1, Durable Objects, Queues or other dependencies are unavailable.

Never use cached KV values as the sole authority for financial balances or hard spending limits.

## 7.5 Advertiser Analytics

Provide authorized reports by:
- Campaign.
- Offer.
- Publisher.
- GEO.
- Device.
- Traffic source.
- Permitted SubID.
- Conversion event.
- Date range.

Support consistent metric definitions, pagination, export and timestamped reporting.

Clearly distinguish:
- Clicks.
- Impressions.
- Received conversion events.
- Approved conversions.
- Rejected conversions.
- Reversals.
- Recorded costs.
- Recorded revenue.

Do not mix pending and approved figures without explicit labels.

## 7.6 Advertiser Funding and Reconciliation

Provide:
- Funding history.
- Verified funding status.
- Available budget.
- Reserved amounts.
- Recorded liabilities.
- Reconciliation discrepancies.
- Failed funding operations.
- Authorized adjustment history.

Reuse existing finance and ledger systems.

Funding adjustments must require appropriate authorization and evidence.

## 7.7 Advertiser Support

Support campaign setup, tracking incidents, disputed conversions, publisher quality issues and billing questions through a role-protected case management workflow.

Every case must have an identifier, status, owner, timeline and recorded outcome.

---

# 8. DIFFERENTIATING PLATFORM FEATURES

## 8.1 Conversion Evidence Trail

Maintain an auditable lifecycle for each conversion:

Click received → Attribution evaluated → Postback authenticated → Idempotency checked → Eligibility evaluated → Risk and policy checks → Review decision → Ledger posting, if eligible.

Not every event must pass through every manual stage.

Record:
- Event identifiers.
- Timestamps.
- Processing outcomes.
- Relevant configuration versions.
- Reason codes.
- Authorized decision actors.
- Retry and reconciliation history.

Protect private data and internal fraud-detection details.

## 8.2 Explainable Rejection System

Provide standardized reasons and human-readable explanations.

Allow disputes where applicable.

A rejected event must not silently disappear from authorized reporting.

## 8.3 Tracking Recovery Assistant

Identify potentially missing or delayed events using available click, postback and advertiser reconciliation records.

Provide a controlled recovery process with:
- Evidence checks.
- Authorization.
- Idempotency.
- Audit events.
- Reconciliation.
- Explicit decision outcomes.

Never manufacture a conversion simply because a publisher reports missing earnings.

## 8.4 Trust-Based Access and Probation

Support configurable account stages:
- Self-declared.
- Documented.
- Verified.
- Independently corroborated.
- Platform verified.
- Trusted.

Trust stages must be based on recorded verification dimensions and review decisions.

Where justified, use probationary caps, additional reviews, reserves and payout holds according to disclosed policies and applicable law.

Provide review and appeal mechanisms.

## 8.5 Unified Incident Room

Provide authorized operational staff with a consolidated view of:
- Tracking failures.
- Queue errors.
- Reconciliation discrepancies.
- Campaign incidents.
- Compliance cases.
- Suspected coordinated abuse.
- Payment failures.
- Integration outages.

Support severity, ownership, incident timeline, remediation, audit history and closure evidence.

## 8.6 Verified Reliability Center

Show genuine operational indicators:
- Last successful tracking test.
- Current known integration health.
- Recent incident history.
- Report freshness.
- Queue backlog, when available.
- Reconciliation status.

Never invent uptime percentages, advertiser counts, payment proofs, conversion volumes or testimonials.

---

# 9. ADULT DATING AND RESTRICTED-CATEGORY COMPLIANCE

Adult Dating must be available only where the advertiser, offer, destination, audience, traffic and jurisdiction are legally eligible.

## 9.1 Compliance requirements

- Category-level risk classifications.
- Versioned category policies.
- Advertiser identity and business verification.
- Domain and destination review.
- Manual approval for restricted categories.
- GEO-specific restrictions.
- Legally required age restrictions and age-gating.
- Publisher acceptance of explicit restrictions.
- Landing-page and creative review.
- Traffic-source and promotion-method restrictions.
- Complaint reporting.
- Evidence-backed approval and rejection decisions.
- Emergency pause and incident-response controls.

## 9.2 Prohibited activity

Do not permit:
- Sexual exploitation of minors.
- Content or activity prohibited by applicable law.
- Deceptive or non-consensual sexual content.
- Illegal targeting or unlawful data collection.
- Misleading landing pages.
- Evasion of applicable age or consent requirements.
- Circumvention of platform or jurisdictional restrictions.

## 9.3 Restricted-offer approval

Before activation, validate:
- Advertiser identity and authority.
- Business and domain evidence.
- Destination and content eligibility.
- Relevant jurisdictions.
- Applicable age restrictions.
- Promotion method.
- Required documents and review outcomes.
- Publisher restrictions.
- Tracking integrity.

An uploaded document, self-declared age or screenshot must not automatically establish trust.

Every decision must record:
- Actor.
- Timestamp.
- Policy version.
- Decision.
- Reason.
- Evidence references.
- Subsequent changes.

Provide authorized emergency pause controls.

---

# 10. CATEGORY-AGNOSTIC TRACKING INFRASTRUCTURE

Build reusable tracking independent of offer category.

## 10.1 Click tracking

Support:
- Unique click IDs.
- Offer IDs.
- Publisher IDs.
- Authorized SubIDs.
- Timestamped attribution.
- Campaign and source identifiers.
- Configurable attribution windows.
- Privacy-aware data collection.
- Invalid and duplicate click handling.

Treat all incoming identifiers as untrusted input.

Prevent sensitive information from being placed in public tracking URLs.

## 10.2 Server-to-server postbacks

Implement:
- Authenticated requests.
- Signature validation.
- Key rotation.
- Replay protection.
- Idempotency keys.
- Conversion deduplication.
- Request validation.
- Rate limits.
- Bounded processing.
- Safe logging.
- Correlation IDs.

Never trust an advertiser-supplied payout value without validating it against the applicable server-side payout version.

Never trust client-side conversion claims as proof of a payable conversion.

## 10.3 Conversion states

Support the existing state machine or extend it safely to represent:
- Pending.
- Approved.
- Rejected.
- Reversed.
- Disputed.

Preserve any additional existing states and valid transitions.

State changes must be server-controlled, auditable and consistent with financial ledger entries.

## 10.4 Queue processing

Use Cloudflare Queues where appropriate for:
- Conversion processing.
- Notifications.
- Reconciliation.
- Reporting tasks.
- Retryable background operations.

Define:
- Retry limits.
- Backoff policy.
- Idempotency.
- Dead-letter handling.
- Failure monitoring.
- Replay authorization.
- Recovery procedures.

A queue message must not directly create a second financial credit when retried.

## 10.5 Concurrency-safe caps

Use Durable Objects or another verified concurrency-safe design for sensitive cap operations.

Define:
- Reservation semantics.
- Confirmation and release behavior.
- Duplicate request behavior.
- Failure recovery.
- Reconciliation against D1.
- Behavior during partial outages.

Test concurrent events and crash/retry scenarios.

## 10.6 Tracking reconciliation

Compare authorized click, postback, conversion, queue and ledger records.

Identify:
- Missing expected events.
- Duplicate events.
- Unprocessed queue messages.
- Conversion-to-ledger discrepancies.
- Invalid or delayed state transitions.
- External reporting mismatches.

Recovery must be idempotent and auditable.

---

# 11. DATABASE AND API DESIGN

Inspect the current schema before proposing any table or endpoint.

Reuse existing organizations, users, verification, offers, tracking, conversions, finance, ledger, disputes, support and audit entities whenever possible.

Potential additions, only where genuinely missing:
- `offer_categories`
- `category_policy_versions`
- `offer_versions`
- `offer_geo_rules`
- `offer_traffic_rules`
- `offer_payout_rules`
- `offer_event_definitions`
- `offer_applications`
- `offer_caps`
- `offer_review_decisions`
- `compliance_evidence_references`
- `offer_audit_events`

Existing equivalent entities must be reused rather than duplicated.

## 11.1 Schema requirements

- Foreign keys where supported by the existing architecture.
- Unique constraints for stable identifiers and slugs.
- Indexes matching real query patterns.
- Explicit currency codes.
- UTC timestamps.
- Tenant-scoped relationships.
- Historical references to immutable configuration versions.
- Soft deactivation where historical records must remain valid.
- Appropriate data-retention policies.
- Documented migration recovery procedures.

Inspect how foreign-key enforcement, D1 transactions and migrations actually work in the current project before relying on particular guarantees.

## 11.2 API conventions

Use the existing `/api/v1` conventions.

Potential routes, adapted to actual code:
- `GET /api/v1/offer-categories`
- `POST /api/v1/admin/offer-categories`
- `PATCH /api/v1/admin/offer-categories/:id`
- `GET /api/v1/offers`
- `POST /api/v1/offers`
- `GET /api/v1/offers/:id`
- `PATCH /api/v1/offers/:id`
- `POST /api/v1/offers/:id/submit-review`
- `POST /api/v1/offers/:id/approve`
- `POST /api/v1/offers/:id/pause`
- `POST /api/v1/offers/:id/applications`

Do not create duplicate endpoints when equivalent routes already exist.

## 11.3 API requirements

- Server-side input validation.
- Role- and permission-based authorization.
- Tenant isolation.
- Consistent error formats.
- Request correlation IDs.
- Pagination and bounded query limits.
- Validated sorting and filtering.
- Idempotency for retryable mutations.
- Rate limiting.
- Safe error messages.
- Explicit state-transition validation.
- Audit events for privileged actions.

Authorization must be enforced on every protected route, not only through hidden frontend navigation.

---

# 12. FRONTEND APPLICATION AND DESIGN SYSTEM

## 12.1 Core interfaces

### Public
- Public category directory.
- Eligible public offer listings.
- Publisher and advertiser registration.
- Trust and transparency information.
- Support and policy information.

### Publisher
- Dashboard.
- Offer Marketplace.
- Offer Details.
- Applications.
- Earnings Center.
- Conversion Confidence Monitor.
- Tracking Setup.
- Payout History.
- Verification Center.
- Disputes and Support.

### Advertiser
- Dashboard.
- Campaign Launch Studio.
- Offer Management.
- Campaign Health.
- Conversion Quality Shield.
- SubID Analytics.
- Postback Diagnostics.
- Funding and Reconciliation.
- Compliance and Support.

### Administration
- Category Management.
- Offer Review Queue.
- Restricted-Category Compliance Queue.
- Advertiser and Publisher Verification.
- Finance and Ledger Operations.
- Payout Operations.
- Dispute Management.
- Tracking Health.
- Incident Room.
- Audit Log.
- System Health.
- Role and Permission Management.

Only render actions permitted by the current user's role, while maintaining independent server-side authorization.

## 12.2 Premium visual identity

Design language:
- Dark obsidian and midnight navy foundation.
- Restrained cyan, electric blue and violet accents.
- Layered glass-like surfaces.
- Subtle 3D depth.
- Carefully controlled glow.
- Clear typography and numeric hierarchy.
- Fine borders and restrained highlights.
- High-quality empty and error states.
- Consistent iconography.
- Responsive layout and accessible contrast.

Avoid excessive neon, unreadable text, heavy animations, oversized cards and decorative elements that make real business information harder to understand.

## 12.3 Signature visual components

### Conversion Pulse
A data-driven view of actual tracking activity and processing status.

### Trust Graph
A visualization of recorded verification dimensions and review progress.

### Campaign Radar
A summary of actual campaign health signals.

### Earnings Timeline
A ledger-linked history of authorized conversion and payment events.

### Offer Discovery Explorer
A visually distinctive browsing experience with ordinary search, filters and accessible navigation.

### Risk Signal Map
A privacy-aware view of authorized campaign risk indicators.

These components must use actual application data or clearly labeled synthetic test fixtures. Do not fabricate production values to make the UI look active.

## 12.4 UI behavior

- Support keyboard navigation.
- Use accessible labels and focus indicators.
- Respect reduced-motion preferences.
- Provide loading, empty, error, offline and permission-denied states.
- Keep financial terms and restrictions visible.
- Ensure critical actions have confirmation and appropriate feedback.
- Avoid color-only status indicators.
- Optimize rendering and animation for modest hardware.
- Use charts only when the underlying data and metric definitions are valid.

---

# 13. CLOUDflare INFRASTRUCTURE

Use the existing architecture and introduce services only when justified.

## 13.1 React + Vite + TypeScript
Responsible for the user interface, accessible interactions and presentation.

The frontend must not be authoritative for:
- Authentication decisions.
- Permissions.
- Offer eligibility.
- Conversion validity.
- Commission calculation.
- Budget availability.
- Cap enforcement.
- Payout authorization.

Never expose private secrets through Vite client environment variables.

## 13.2 Cloudflare Workers + Hono
Responsible for:
- API handling.
- Authentication and authorization.
- Business rules.
- Offer and category management.
- Conversion processing.
- Financial workflows.
- Policy enforcement.
- Audit logging.

## 13.3 Cloudflare D1
Use for structured application data and durable relational records appropriate to the existing architecture.

Keep financial records and configuration versions authoritative in the appropriate database-backed systems.

## 13.4 Durable Objects
Use where verified concurrency-sensitive coordination is required, including cap enforcement or serialized processing.

Document consistency and recovery behavior.

## 13.5 Cloudflare Queues
Use for reliable asynchronous processing with bounded retries, idempotency and dead-letter handling.

## 13.6 Cloudflare R2
Store private compliance evidence and approved files with:
- Restricted access.
- Short-lived authorized retrieval.
- File type and size validation.
- Malware scanning where available.
- Metadata minimization.
- Retention and deletion policies.
- Audit logging.

Never expose private evidence through permanent public URLs.

## 13.7 Cloudflare KV
Use for suitable cache and configuration use cases.

Do not use KV as the sole authority for financial balances, conversion uniqueness or concurrency-sensitive spending limits.

## 13.8 Cron Triggers
Use for:
- Scheduled reconciliation.
- Expiration processing.
- Review reminders.
- Cleanup under retention policies.
- Monitoring and reporting tasks.

Jobs must be idempotent and observable.

## 13.9 Turnstile and security controls
Use appropriate anti-automation protections, rate limiting and WAF controls.

Do not treat a successful challenge as proof of identity or legitimacy.

## 13.10 GitHub Actions
Add or extend CI checks for:
- Typechecking.
- Unit and integration tests.
- Production builds.
- Migration validation.
- Dependency and secret scanning.
- Linting where configured.
- Deployment configuration validation.

Inspect current Cloudflare documentation and deployed service capabilities before implementing service-specific assumptions.

---

# 14. SECURITY, PRIVACY AND TENANT ISOLATION

Implement and test:
- Server-side authorization on every protected route.
- Least-privilege roles and permissions.
- Tenant-scoped reads and writes.
- Secure session handling.
- CSRF protection where applicable.
- Input validation and output encoding.
- Rate limiting.
- Abuse detection.
- Secret management and rotation.
- Private evidence access controls.
- Safe error responses.
- Audit logging.
- Data minimization.
- Retention and deletion procedures.
- Secure file handling.
- Cross-tenant access protection.
- Privilege-escalation protection.

Device and network signals must be treated as imperfect risk indicators.

No single IP address, browser fingerprint or device identifier proves a person's identity. Account-abuse prevention must account for shared devices, households, mobile networks and legitimate privacy tools.

Do not promise that one device can never create multiple accounts. Instead, combine proportionate controls, verification, risk analysis, rate limits, manual review and appeals.

Restricted-category checks must not be bypassable through direct API requests, forged frontend state or alternate routes.

---

# 15. VERIFICATION AND ACCOUNT TRUST

Implement a multi-dimensional trust model.

Potential dimensions:
- Email.
- Phone.
- Identity.
- Business.
- Domain.
- Property ownership.
- Traffic source.
- Historical evidence.
- Compliance review.

Rules:
- Verification states must be independently represented.
- Evidence uploads do not automatically approve accounts.
- Reviewers must have explicit permissions.
- Verification decisions must be auditable.
- Sensitive evidence must be private.
- Verification expiration and re-review rules must be configurable.
- Failed verification must provide a safe and actionable explanation.
- Common email providers must not trigger automatic rejection.
- Applicants must have an appropriate review or appeal path.

Any single-device account restrictions must be proportionate, privacy-aware and compatible with legitimate shared-device scenarios.

---

# 16. OBSERVABILITY AND OPERATIONS

Provide structured, privacy-aware logs and operational metrics.

Monitor:
- API errors and latency.
- Authentication and authorization failures.
- Postback verification failures.
- Queue processing and dead-letter volume.
- Conversion reconciliation discrepancies.
- Cap enforcement errors.
- Database failures.
- Payment-provider failures.
- Integration freshness.
- Restricted-category incidents.
- Evidence access.
- Privileged actions.

Use correlation IDs to trace a request through relevant processing stages.

Do not log API secrets, authentication tokens, full payment credentials or unnecessary personal data.

Define incident ownership, severity, response steps, recovery procedures and post-incident review.

---

# 17. TESTING AND ACCEPTANCE CRITERIA

## 17.1 Repository and regression
- Existing functionality remains intact.
- Baseline tests and post-change tests are compared.
- Existing migrations continue to work.
- New migrations work against the supported starting schema.
- Rollback or recovery limitations are documented.

## 17.2 Categories
- Add and deactivate categories without changing frontend business logic.
- Reject duplicate slugs.
- Reject invalid parent relationships and cycles.
- Preserve historical category references.
- Enforce administrative authorization.

## 17.3 Offers and payouts
- Validate every supported payout model.
- Test currency and rounding rules.
- Test tier boundaries.
- Test hybrid commission calculations.
- Preserve payout version references.
- Reject invalid offer activation.
- Verify valid state transitions.
- Prevent unauthorized payout configuration changes.

## 17.4 Tracking
- Reject invalid signatures.
- Reject replayed requests.
- Deduplicate repeated conversion events.
- Test concurrent postbacks.
- Validate attribution windows.
- Test reversal and dispute transitions.
- Verify that advertiser-provided payout values cannot override server rules.

## 17.5 Finance
- Validate double-entry ledger invariants.
- Reconcile conversion and ledger records.
- Prevent duplicate financial credits.
- Test payout failures and retries.
- Verify currency consistency.
- Confirm that pending earnings cannot be presented as payable balances.

## 17.6 Security
- Test cross-tenant data access.
- Test privilege escalation.
- Test direct API access to restricted actions.
- Test evidence access authorization.
- Test rate limits and input validation.
- Test secret scanning and safe error handling.

## 17.7 Queue and cap processing
- Test concurrent cap enforcement.
- Test retry and dead-letter behavior.
- Test duplicate messages.
- Test dependency outages.
- Test recovery after partial processing.
- Verify idempotent reconciliation.

## 17.8 Frontend
- Test loading and empty states.
- Test error and permission-denied states.
- Test accessible navigation.
- Test responsive layouts.
- Test reduced-motion behavior.
- Verify that real financial and performance data is displayed accurately.

## 17.9 Required verification report

Record:
- Exact command.
- Exit status.
- Test counts.
- Failures.
- Build result.
- Migration result.
- Security-check result.
- Environment limitations.
- Unresolved defects.

Do not report a test as passing if it was not executed or its result is unknown.

Passing unit tests alone does not prove production readiness.

---

# 18. IMPLEMENTATION PHASES

## Phase A — Full repository audit
Inspect documentation, architecture, schema, routes, UI, tests, integrations and Git status.

Deliver an implementation gap matrix and baseline report.

## Phase B — Category and policy configuration
Implement only missing category management, stable identifiers, validation and versioned policy controls.

## Phase C — Offer and payout engine
Implement offer configuration, payout versioning, event definitions and validated lifecycle transitions.

## Phase D — API security and authorization
Complete route authorization, tenant isolation, audit logging and input validation.

## Phase E — Publisher experience
Implement or extend earnings transparency, offer discovery, tracking diagnostics and disputes.

## Phase F — Advertiser experience
Implement or extend campaign setup, budget/cap protection, postback diagnostics and analytics.

## Phase G — Restricted-category compliance
Implement evidence-backed review, policy enforcement, publisher restrictions, appeals and emergency pauses.

## Phase H — Tracking and financial integrity
Validate deduplication, queues, caps, reconciliation and ledger invariants.

## Phase I — Premium 3D-inspired UI
Apply a consistent visual system after identifying the actual existing frontend architecture and reusable components.

## Phase J — Security and regression verification
Run existing and new tests, typechecks, builds, migration tests and security checks.

## Phase K — Documentation and launch readiness
Update `STATE.md`, PRD traceability, architecture notes, operations guides and residual-risk reports.

Phases may be subdivided into small, testable units. Security and data-integrity dependencies take precedence over visual work.

---

# 19. IMPLEMENTATION GAP MATRIX

Before coding, create a matrix with:

- Requirement ID.
- Requirement.
- Existing implementation.
- Exact file or route references.
- Existing tests.
- Missing behavior.
- Security or migration risk.
- Proposed change.
- Dependencies.
- Acceptance test.
- Status.

Use statuses such as:
- Verified Existing.
- Partially Implemented.
- Missing.
- Blocked.
- Implemented, Not Yet Verified.
- Verified Implemented.

Do not mark a feature complete merely because a route, schema field or placeholder component exists.

---

# 20. DOCUMENTATION AND DELIVERABLES

Maintain:
- Updated full PRD.
- `STATE.md`.
- PRD traceability matrix.
- Repository audit report.
- Database schema and migration notes.
- API and permission documentation.
- Payout calculation specifications.
- Tracking and postback documentation.
- Compliance workflow documentation.
- Security and privacy notes.
- Deployment configuration checklist.
- Test and verification report.
- Operational runbooks.
- Residual risks and known limitations.

Record external dependencies and integrations that still require credentials, commercial agreements or manual configuration.

---

# 21. PRODUCTION READINESS GATE

Do not declare the platform production-ready until the applicable requirements have been verified.

Required areas:
- Secure authentication and authorization.
- Tenant isolation.
- Validated category and offer configuration.
- Versioned payout rules.
- Correct ledger and reconciliation.
- Idempotent tracking.
- Concurrency-safe cap enforcement.
- Restricted-category compliance.
- Working frontend workflows.
- Reliable background processing.
- Operational monitoring.
- Valid deployment configuration.
- Recovery and incident procedures.
- Security and regression tests.
- Required live integrations and credentials.

Clearly distinguish:
1. Implemented in code.
2. Verified by automated tests.
3. Verified in a deployed environment.
4. Dependent on external configuration.
5. Not yet implemented.
6. Known residual risk.

Never conflate these states.

---

# 22. FINAL EXECUTION INSTRUCTION FOR THE AI CODING AGENT

Begin by auditing the actual repository.

Do not start by rewriting the application or generating large amounts of new code.

First report:
1. Existing implementations.
2. Reusable backend and frontend components.
3. Publisher problems already solved and still unresolved.
4. Advertiser problems already solved and still unresolved.
5. Database and migration risks.
6. Tracking, finance and security risks.
7. Exact files requiring changes.
8. Prioritized implementation units.
9. Baseline test and build results.

Then implement the smallest safe unit, run the relevant checks, review the diff and update the documentation before proceeding.

Do not skip failed tests, fabricate production data, invent external integration results, delete unrelated work or claim unverified success.

Commit and push only when explicitly authorized.

The target is a distinctive, premium, extensible and trustworthy TrafficVaultHub network that helps publishers understand and protect their earnings, helps advertisers improve conversion quality and control spending, and maintains auditable tracking, accurate accounting and secure operations.

The platform must remain adaptable through configuration and versioned contracts, not by promising that future changes will never be necessary.
