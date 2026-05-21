# CI / CD

This page covers the two GitHub Actions workflows: the `@claude` comment trigger that launches the coordinator pipeline, and the automatic PR review that runs on every PR.

---

## Overview

| Workflow | File | Trigger | What it does |
|----------|------|---------|-------------|
| Claude Coordinator | `.github/workflows/claude.yml` | `@claude` comment in issue or PR | Launches the full coordinator-agent pipeline |
| Claude PR Review | `.github/workflows/claude-review.yml` | PR opened / updated | Automatic review: TypeScript, security, tests, UI states |

Neither workflow ever:
- Merges a PR automatically
- Pushes directly to `main`
- Runs `prisma migrate reset`
- Deletes tests
- Deploys to production

---

## Workflow 1: `claude.yml` — The @claude Trigger

### File

`.github/workflows/claude.yml`

### Trigger

Any comment on an issue or pull request that contains the string `@claude`.

```yaml
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
```

### Permissions Required

```yaml
permissions:
  contents: write        # Read repo + commit changes to PR branch
  pull-requests: write   # Open PRs, add comments
  issues: write          # Add comments to issues
```

### What Happens

1. GitHub Actions receives the `issue_comment` or `pull_request_review_comment` event
2. The workflow checks that the comment contains `@claude`
3. Checks out the repository
4. Installs Claude Code globally
5. Launches the **coordinator-agent** with `--max-turns 20`
6. The comment text becomes the coordinator's initial prompt
7. The coordinator runs through its full pipeline (design → backend → frontend → testing)
8. At the end, the coordinator commits changes to the PR branch and adds a summary comment

### Max Turns

`--max-turns 20` limits the coordinator to 20 conversational turns per GitHub Actions invocation. This is a cost-control safeguard — very large tasks may need to be split across multiple `@claude` comments.

### Environment Variables

The workflow uses the repository secret `ANTHROPIC_API_KEY`:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Setup Instructions

1. In your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `ANTHROPIC_API_KEY`
3. Value: your API key from [console.anthropic.com](https://console.anthropic.com)
4. Push the `.github/workflows/` folder to your repository

---

## Workflow 2: `claude-review.yml` — Automatic PR Review

### File

`.github/workflows/claude-review.yml`

### Trigger

Every pull request that is opened, synchronized (new commit pushed), or reopened:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

### What It Reviews

The reviewer checks the diff of the PR against `main` for:

| Category | What is checked |
|----------|----------------|
| TypeScript correctness | Type errors, improper `any`, missing type annotations |
| Security | Auth checks on every mutation, no hardcoded secrets, no service role key in frontend |
| Ownership checks | Multi-user mutations check `userId === session.user.id` |
| Missing tests | New Server Actions or API routes without corresponding tests |
| UI states | New components implement loading, error, empty, and success states |
| Migration safety | New Prisma migrations are reversible; no `migrate reset` or `db push` |
| Scope | PR does not contain large unrelated refactors mixed with the feature |
| Forbidden patterns | `dangerouslySetInnerHTML` with user input, raw SQL, PII in logs |

### Output Format

The review comment ends with one of three verdicts:

| Verdict | When used |
|---------|----------|
| `GREEN: Approve` | All checks pass, no blocking issues |
| `YELLOW: Request changes` | Minor issues that should be addressed before merge |
| `RED: Block` | Critical issues (security hole, broken tests, missing auth check) |

The review also includes:
- Top 3 issues (if any)
- Manual QA suggestions specific to this PR

### Note on Auto-Approval

The review workflow posts a comment — it does not approve the PR via the GitHub review API. A human developer must read the review and decide whether to merge. This is by design.

---

## How to Use @claude in Issues and PRs

### Starting a Feature from an Issue

Comment in the issue:

```
@claude use coordinator-agent and implement this feature as described.
Delegate design, frontend, backend, and testing work to specialized agents.
Open a PR when done — do NOT merge automatically.
Branch name: feature/pin-todos
```

The coordinator will:
1. Read the issue description
2. Propose a phased plan as a reply comment
3. Execute the pipeline (design → backend → frontend → testing)
4. Commit the changes to the specified feature branch
5. Open a PR with a summary
6. Add a summary comment to the original issue

### Iterating on a PR

Comment in the PR:

```
@claude testing-agent reported that the pin button does not have an aria-label.
Use frontend-agent to add aria-label="Pin todo" and "Unpin todo" based on state.
Update this PR — do not open a new one.
```

### Requesting a Different Approach

```
@claude this PR implements togglePinTodo as a Server Action, but I want it
as a REST API route at PATCH /api/todos/[id]/pin.
Use coordinator-agent to switch the backend. Keep the frontend unchanged.
```

### Asking for a Review of Specific Areas

```
@claude review the auth check pattern in app/actions/todos.ts.
Is it consistent with api-rules.md?
```

---

## What Never Happens Automatically

This is a deliberate safety boundary. The CI system never:

| Forbidden action | Why |
|-----------------|-----|
| Merge PRs automatically | A human must verify the diff and test results |
| Push directly to `main` | Blocked in coordinator settings |
| Run `prisma migrate reset` | Blocked in coordinator settings — would wipe all data |
| Delete tests | Forbidden in testing-agent instructions |
| Bypass pre-commit hooks | Never use `--no-verify` |
| Expose service role keys | Blocked in all agent instructions |

---

## Cost Considerations for GitHub Actions

Each `@claude` trigger starts a full session. Budget implications:

| Pipeline type | Approximate tokens | Approximate USD |
|--------------|-------------------|----------------|
| Quick change (frontend only) | 25k–40k | $0.40–$0.80 |
| Medium feature (full pipeline) | 150k–200k | $3–$5 |
| Large feature (multiple screens) | 200k–400k | $5–$10 |
| PR review only | 20k–40k | $0.30–$0.60 |

GitHub Actions billable minutes are separate from Anthropic API costs. The actual CPU time for Claude Code is minimal (most time is waiting for the API).

To control costs in GitHub Actions:
- Use `--max-turns 20` (already configured)
- Break large features into smaller `@claude` invocations
- The automatic PR review (`claude-review.yml`) is relatively cheap (~20-40k tokens) because it only reads the diff

---

## Local vs. GitHub Actions

| Aspect | Local session | GitHub Actions |
|--------|--------------|----------------|
| Launch | `claude --agent coordinator-agent` | `@claude` comment |
| Checkpoints | Interactive (you type yes/no) | Non-interactive (coordinator runs to completion) |
| Cost visibility | `/cost` command | Check Anthropic console after run |
| Best for | New features, complex decisions | PRs, team collaboration, async work |
| Max turns | Unlimited | 20 (configurable) |

In GitHub Actions the coordinator runs non-interactively — it executes the full pipeline without checkpoints. This means it makes all decisions autonomously. For new, complex features, prefer local interactive sessions where you can review each checkpoint.

---

## Troubleshooting

### `@claude` Comment Has No Effect

1. Check that `ANTHROPIC_API_KEY` is set in repository secrets
2. Check that the workflow file is on the default branch
3. Check the Actions tab for failed workflow runs and read the error log

### Coordinator Cannot Delegate in GitHub Actions

If you see "Agent tool not available" in the workflow logs, the coordinator was not launched as the main thread. Verify the workflow uses `claude --agent coordinator-agent`, not just `claude`.

### PR Review Is Not Posted

Check that the workflow has `pull-requests: write` permission. If the PR is from a fork, GitHub Actions restricts write permissions by default for security. Review from forks requires explicit permission grants in the workflow.

### Workflow Exceeds Max Turns

If a complex task hits the `--max-turns 20` limit mid-way, post another `@claude` comment with the continuation prompt:

```
@claude continue from where you left off. The design phase is done.
Proceed with Phase 2: backend-agent.
```
