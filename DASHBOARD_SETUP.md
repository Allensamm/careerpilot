# CareerPilot owner dashboard setup

The private dashboard is available at /dashboard. It collects anonymous first-party website activity only after a visitor accepts the analytics notice.

## 1. Create the free analytics database

1. Create a Supabase project at https://supabase.com.
2. Open the project's SQL Editor.
3. Run the complete contents of analytics-schema.sql.
4. In Project Settings -> API, copy the Project URL and the service_role secret key. Never put the service-role key in browser code or commit it to GitHub.

## 2. Add Vercel environment variables

In the CareerPilot Vercel project, open Settings -> Environment Variables and add these for Production (and Preview if you want preview tracking):

- SUPABASE_URL — your Supabase Project URL.
- SUPABASE_SERVICE_ROLE_KEY — the server-side service-role secret.
- DASHBOARD_ACCESS_CODE — 808080 (the requested owner code).
- DASHBOARD_SESSION_SECRET — a unique random secret of at least 32 characters. Generate one locally with openssl rand -hex 32.

Save the variables and redeploy the project. Do not place these values in agency-config.js, HTML, or any public JavaScript file.

The six-digit access code is convenient but not as strong as a long password. Login attempts are limited to five per 15-minute window per keyed IP hash. Use a longer secret code if you want stronger protection.

## 3. Open the dashboard

Visit https://careerpilot-inky.vercel.app/dashboard and enter the owner code. The server issues an HttpOnly, Secure, SameSite session cookie that expires after 12 hours. The code is not sent to the browser as a stored setting.

## 4. What is measured

After a visitor accepts the analytics notice, CareerPilot records:
- Anonymous browser and session identifiers.
- Page views and page paths.
- Engaged time in 15-second increments while a page is visible.
- Clicks, outbound link clicks, form submissions (event only, never field values), and interactions inside tool sections.
- Tool/section identifier and the label of the clicked control.
- Device category, browser family and operating system family, inferred from the request's user-agent header.
- Referring website domain, not the full referring URL.

CareerPilot does not intentionally store raw IP addresses, names, email addresses, form contents, CV text, uploaded documents, or typed planner content. The login throttle stores only a keyed hash of the request IP. Visitor identifiers are pseudonymous, not a way to discover a person's real identity.

## 5. Consent and retention

- No analytics event is sent until the visitor selects Accept analytics.
- If a visitor selects Reject, no visitor/session identifier is created and no analytics events are sent.
- Visitors can withdraw consent by clearing the site's cp_analytics_consent preference in their browser.
- The dashboard displays up to the most recent 90 days and 10,000 events. Periodically run the 90-day deletion statement at the bottom of analytics-schema.sql in Supabase to remove older records.
- Update the public Privacy Notice to reflect your agency's final legal details and any applicable privacy requirements before promoting the analytics-enabled website.

## 6. Troubleshooting

- If the dashboard says the database is not configured, check the four Vercel environment variables and redeploy.
- If it says the analytics table is missing, run analytics-schema.sql in the correct Supabase project.
- If the dashboard loads but shows no visits, visit the public website, accept the analytics notice, browse a few pages and use a tool. Then refresh the dashboard.
- Ad blockers or visitors declining analytics can result in under-counting. Counts represent consenting browsers, not every human visitor.
