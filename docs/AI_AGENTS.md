# AI agents

Five agents are defined for WNJO. **All are switched off**, and nothing calls a model until a provider key is configured and an agent is enabled.

| Agent | Key | Purpose |
|---|---|---|
| Project manager | `project_manager` | Plans projects, breaks them into tasks, tracks dependencies. |
| Developer | `developer` | Builds and maintains sites. Not yet connected to GitHub for client repositories. |
| QA engineer | `qa_engineer` | Independently checks work. |
| Client success | `client_success` | Handles routine client messages; escalates disputes and pricing. |
| Operations manager | `operations_manager` | Monitors deadlines, capacity and spend; produces the morning briefing. |

## How work flows
1. A business event arrives (for example a deposit paid or a client message). `src/lib/ai/events.ts` maps it to tasks. Each task has a stable key, so duplicates do nothing. An agent's own events never trigger that agent.
2. The runner (`src/lib/ai/runner.ts`) works through a task. Before every model call it checks the budget (task, agent, project and global limits), and it refuses tools the agent isn't permitted to use.
3. High-risk tools stop the task and wait for an owner approval, shown in the AI tab. Approving allows that tool for that task only.
4. Failures are retried only when they're transient, with backoff, up to a fixed number of attempts. Authentication and invalid-response errors are not retried. A runaway tool loop fails the task at once.

## Still to build before enabling
- Connect the database-backed store to the budget limits (needs the server key).
- Budget-setting screens for staff.
- Background processing of events and tasks now runs after the webhook responds (`after()`). A slow model call still runs inside a single serverless invocation, so long tasks need a proper worker before heavy use.
- The agent instructions and their version history.
- Connect the Claude provider once `ANTHROPIC_API_KEY` is set in Vercel. The adapter has not been checked against the live API.

## Enabling an agent (when ready)
Do this for one agent, on a non-production project, first: set the global budget above zero, set a project budget, enable the agent, and watch its runs in the AI tab.
