# CareerPilot Professional Assessment — deployment and security runbook

## Status and scope

The redesigned homepage is a **public product presentation** and does not expose the internal AI system.

The \`/assessment\` route is a **secure-intake implementation gated OFF by default**. It must not accept real CVs or take live payments until Supabase, a trusted malware scanner, Stripe, Resend, staff accounts and the privacy/terms review are complete. Without configuration, the public page displays a contact-only alternative.

Never claim production readiness based solely on deployment or a passing test workflow. This integration includes no live AI-processing orchestration and no built-in report generator. Assessment reports are produced by authorised staff through the separately operated proprietary system and delivered through an agreed private channel.

## Setup checklist

1. **Production hostname**: choose an HTTPS production origin for \`PUBLIC_SITE_URL\`, e.g. \`https://careerpilot-inky.vercel.app\`. Do not include a trailing slash. Only this origin can submit sensitive cross-origin requests.
2. **Supabase**: provision a private Supabase project in the approved region, select the region according to your published processing policy, and run all of \`assessment-schema.sql\` in Supabase's SQL Editor. Confirm the storage bucket \`career-assessments-private\` is **private**. No anon/authenticated policies should allow reading the bucket or the assessment tables. Do not combine private and public analytics records in one table.
3. **Staff**: provision staff accounts *manually* through Supabase Auth (email/password); verify their email addresses. Add only their exact email addresses to \`ADMIN_ALLOWED_EMAILS\`. Ensure staff passwords are unique and enable available identity-provider MFA and phishing protections. Review whether an additional identity-proxy layer is appropriate for live CV handling.
4. **Malware scanning**: host a confidential, approved HTTPS scanning endpoint configured with \`ASSESSMENT_SCANNER_URL\` and \`ASSESSMENT_SCANNER_TOKEN\`. It must accept raw PDF/DOCX bytes with Content-Type and a Bearer token, and return JSON \`{"clean":true}\` **only** after a complete malware scan. Reject infected, unsupported, oversized and scanning-failed files. The code also validates extension, file signatures and basic DOCX structure; these checks are **not** a substitute for malware scanning. Document the scanner's identity, retention and jurisdiction in the public privacy notice before launch.
5. **Stripe**: connect a legitimate, eligible Stripe merchant account with the correct business country and legal entity. Configure \`STRIPE_SECRET_KEY\` server-side. Add the webhook endpoint \`https://YOUR_DOMAIN/api/assessment/webhook\` and subscribe to \`checkout.session.completed\` and \`checkout.session.async_payment_succeeded\`. Store its signing secret as \`STRIPE_WEBHOOK_SECRET\`. Test a $50 USD one-time payment end to end in **Stripe test mode** before enabling live keys.
6. **Email**: verify a sending domain in Resend; configure \`RESEND_API_KEY\` and \`EMAIL_FROM\` as a verified address. Test payment confirmation, application received, in-progress, completed and delivered notifications. The email outbox retries failed sends through the scheduled maintenance endpoint.
7. **Retention**: configure \`CRON_SECRET\` (a long random secret). Vercel invokes \`/api/assessment/maintenance\` every day at 04:00 UTC. Verify it actually runs and audit deletions. Under the published policy: unpaid CVs expire in 48 hours, unpaid profile details in 7 days; paid CVs expire 30 days after delivery or 90 days after payment; paid identity/profile text expires after 180 days. Internal staff deletion takes effect sooner on a verified request. Payment references may need separate regulated/legal retention. Provider backups may persist according to their documented policies.
8. **Privacy and legal**: publish an approved privacy notice identifying the actual business entity, contact, scanner, service processors, international transfer safeguards, purpose, rights and legal bases. Approve terms, refund/cancellation policy, service expectations, and applicable consumer disclosures with qualified advisers. Only set \`ASSESSMENT_POLICY_APPROVED=yes\` **after** this review.
9. **Review security**: enforce TLS, protect service-role credentials, restrict staff access, configure account MFA / conditional access, review logs for PII, establish backups and incident response, and perform a security test with fictional PDFs and test cards. Never commit secrets. Do not expose real CVs through signed/public URLs or email attachments.
10. **Monitor**: verify Stripe webhooks, email outbox, rate-limit RPC, deletion job, scanner errors, and successful order/admin flows in a controlled test environment. Lighthouse targets of 90+ across performance, accessibility, best practices and SEO are goals requiring actual desktop/mobile measurements, not guarantees.

## Required Vercel server-side environment variables

| Variable | Purpose |
|---|---|
| \`PUBLIC_SITE_URL\` | Approved HTTPS production origin |
| \`SUPABASE_URL\` | Supabase project HTTPS endpoint |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Server-only legacy \`service_role\` JWT |
| \`SUPABASE_ANON_KEY\` | Supabase auth public key, used *server-side* for staff session login |
| \`STRIPE_SECRET_KEY\` | Stripe restricted/test/live secret; never expose in frontend |
| \`STRIPE_WEBHOOK_SECRET\` | Stripe endpoint signing secret |
| \`RESEND_API_KEY\` | Resend server API key |
| \`EMAIL_FROM\` | Verified email sender, e.g. CareerPilot <team@approved.example> |
| \`RATE_LIMIT_SECRET\` | 32+ byte random signing secret for IP hashing |
| \`ADMIN_ALLOWED_EMAILS\` | Comma-separated, verified staff email allowlist |
| \`CRON_SECRET\` | Random authentication token used by Vercel cron |
| \`ASSESSMENT_SCANNER_URL\` | Approved HTTPS private malware-scan endpoint |
| \`ASSESSMENT_SCANNER_TOKEN\` | Scanner authentication token |
| \`ASSESSMENT_POLICY_APPROVED\` | Exact value \`yes\` only after full operator/legal/privacy review |

All listed variables must be present for the assessment form to activate. \`ASSESSMENT_POLICY_APPROVED\` defaults to OFF.

## Customer journey

1. \`/assessment\`: the browser checks \`GET /api/assessment/status\`. It enables the form only after all dependencies are configured.
2. \`POST /api/assessment/create\`: server validates name, email, professional bio, goals and recorded consent; creates a private order and a two-hour high-entropy capability token.
3. \`POST /api/assessment/upload?id=...\`: server checks capability token, file type, 2 MiB size limit and scanner result, then writes privately to the Supabase storage bucket. It returns no public file URL.
4. \`POST /api/assessment/checkout\`: server checks the private order and CV, then creates a Stripe-hosted Checkout Session priced at **5000 US cents**. Browser leaves CareerPilot for checkout.
5. Stripe webhook: signature validated from the raw body, amount/currency/order checked, idempotent transition to paid recorded in database; notification outbox items inserted.
6. \`/assessment-confirmation\`: the server verifies the Stripe session and returns a limited non-PII receipt status. Confirmation doesn't trust query parameters alone.
7. \`/admin\`: manually provisioned authorised staff sign in and review orders, download privately stored CVs, advance assessment status, and delete documents/profile text. No CV URL is exposed in HTML.
8. Maintenance job: retries email, deletes expired stored documents and scrubs personal profile data.

## Known production limitations

- Staff login uses verified Supabase email/password and an HttpOnly/SameSite/secure cookie. An additional MFA requirement or organisation SSO access proxy should be enforced before real CV handling; the current interface does not provide an in-app MFA enrollment flow.
- Malware scanning must be operated by a real trusted provider; merely setting the two scanner variables is not proof of a compliant scanner.
- Emails are queued with idempotency keys; test webhook replay/concurrent maintenance. Review failed outbox records. Delivery can be retried and real-world email providers may be slow.
- The frontend does not create an assessment report. Staff prepare and privately deliver results through an approved workflow.
- Identity verification for privacy requests made by email remains a staff process; deletion is available in the private admin.
- Supabase storage and database provider backups require separate retention and erasure review.
- Complete responsive/browser QA, accessibility auditing, legal review and independent security testing are necessary before advertising the payment flow.
- Previous CareerPilot tools, sandbox demos and prototype job-discovery code remain in the repository for backwards compatibility but are **not advertised on the new landing page**.
