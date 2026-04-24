# AI Delivery Agent Rules

## Definition of Done

A task is done only when all of the following are true:

- The requested code, scripts, docs, and config changes are implemented in this repository.
- The solution is consistent with the task described in `.ai-team/task.md`.
- Reasonable validation has been run when applicable, such as targeted tests, lint, type checks, or syntax checks.
- The final response clearly states what changed, what was validated, and any remaining risks or manual follow-up.
- The repository is left in a reviewable state with local changes visible through `git status` and `git diff`.

## Working Rules

- Do not ask the user whether to continue in the middle of execution.
- You may modify files in the current repository.
- You may run local tests, lint, builds, and static checks that stay within this repository.
- You may inspect `git status`, `git diff`, `git diff --stat`, and related local read-only git commands.
- Prefer small, reviewable changes and clear final summaries.

## Safety Boundaries

The following actions are forbidden unless a human explicitly instructs and confirms them:

- `git push`
- any deploy or release action
- `sudo`
- production operations of any kind
- reading `.env`
- reading secrets or credentials
- reading `~/.ssh`, `~/.aws`, or similar credential locations
- `rm -rf`
- mass deletion or destructive cleanup
- changing remote git configuration
- automatically committing or tagging

## Network and Approval Posture

- Do not assume network access is allowed.
- Do not default to downloading dependencies or browsing the web.
- If an action may be risky, destructive, privileged, or outside the repository, stop and require human confirmation first.
