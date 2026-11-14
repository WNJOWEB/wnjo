# Testing

## Unit tests (run anywhere)
```
npx vitest run
```
Covers pricing parity (more than 10,000 answer combinations), quote records, catalogue mapping, the enquiry route, the AI engine (permissions, budgets, approvals, retries, loop limits, provider errors, run store), event routing, the morning briefing and its scheduling.

## Database tests (need the live Supabase project)
Each file in `supabase/tests/` runs in one transaction and ends with a deliberate error that rolls everything back. The output lists PASS or FAIL for every check. Run them in the Supabase SQL editor, or with `psql`, as the database owner.

| File | Checks | Covers |
|---|---|---|
| `isolation.sql` | 19 | Tenant and client isolation |
| `quotes.sql` | 11 | Catalogue isolation, immutable snapshots, one acceptance per version |
| `acceptance.sql` | 12 | Quote acceptance and decline rules |
| `store_quote.sql` | 4 | Atomic quote storage, server-only |
| `messages.sql` | 15 | Internal notes hidden from clients |
| `approvals.sql` | 16 | Approval decisions and revisions |
| `files.sql` | 9 | File metadata access, private bucket |
| `notifications.sql` | 11 | One per recipient, opt-outs, no truncation |
| `project_columns.sql` | 3 | Internal project fields hidden |
| `staff_projects.sql` | 4 | Staff can't move projects or create them from the browser |
| `ai_access.sql` | 6 | AI records are read-only from the browser |

Last full run of each file: before the most recent database changes. Rerun them after any migration.

## Not yet tested
- Signed-in flows in the browser (client account, staff admin). These need a sign-in link.
- Live server writes on the production database (quotes, enquiries, files). The key is configured; a test submission on the preview would confirm it.
- Payments, Stripe webhooks, the Claude provider, GitHub-based deployment. These aren't built or connected.
- Accessibility and performance audits of new screens.
