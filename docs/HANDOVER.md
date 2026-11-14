# Handover

Read this first in any new session. It holds the working rules and open items that aren't in the code.

## Working rules (from the owner)

- Commit locally. Push or merge to main only when the owner says "push" or "merge to main". If a stop hook asks for a push, decline and give the commit hashes.
- Merge is fast-forward only: push the feature branch to `main` with `git push origin claude/hopeful-rubin-b40vgv:refs/heads/main`, then push the branch itself.
- Keep replies short and plain. Sentence-case labels. Tick checklist items only when confirmed.
- Give copy-paste SQL for any database change. Never run a destructive change without the owner's OK.
- Never put secrets in chat. API keys go in the Vercel dashboard. Do not request credentials for api.anthropic.com.
- Do not add api.supabase.com or api.vercel.com to allowed hosts.
- Recommend the easiest route first. The owner works from a phone.
- The owner is not VAT registered, has no solicitor, and Core stays at £99 a month.
- Design rules are in `CLAUDE.md`. Next.js rules are in `AGENTS.md`.

## Current state

- AI: Anthropic only. Model `claude-haiku-5-5`. Limits: three rounds per site, £1 ceiling per website, word limits headline 8, intro 18, sentence 18.
- Multi-page template sites are built. The customer chooses Home plus up to five pages (Services, About, Gallery, FAQs, Contact), within their plan limit. Core 5, Plus 10, Pro 20. Templates hold six page types, so Plus and Pro build at most six.
- Facts only. The model writes no service descriptions, and it is told never to invent anything. FAQ answers must come from the customer's facts, are capped at six, and may not repeat each other or the intro.
- Photos: the customer marks one main photo and one logo on the files step. The main photo leads, other photos go in the gallery, and the logo is left out.
- The template test in the staff AI panel has a page-count picker and one tab per page. Re-run it on the live model after these changes.

## Open items

- Remove old `evexec_` helper functions from the `winjo digital` database. Owner needs to confirm the project and count first.
- Template research: study leading sites per sector and rebuild templates. Decide which sectors first.
- Remaining quality step: a rated re-test with a target (for example 8 in 10 rated good), then tune checks on live results.
- Full audit of the AI build with a stronger model, in a fresh session.
- Decide whether to add page types beyond six, so Plus and Pro can build their full page allowance.
