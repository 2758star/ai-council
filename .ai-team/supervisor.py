#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List


ROOT = Path(__file__).resolve().parent.parent
AI_TEAM_DIR = ROOT / ".ai-team"
TASK_FILE = AI_TEAM_DIR / "task.md"
LOGS_DIR = AI_TEAM_DIR / "logs"
REPORTS_DIR = AI_TEAM_DIR / "reports"
DEFAULT_MAX_ROUNDS = 6
STATUS_PATTERN = re.compile(r"^\s*DELIVERY_STATUS\s*:\s*([A-Z_]+)\s*$", re.MULTILINE)
SUMMARY_PATTERN = re.compile(r"^\s*ROUND_SUMMARY\s*:\s*(.+?)\s*$", re.MULTILINE)
NEXT_ACTION_PATTERN = re.compile(r"^\s*NEXT_ACTION\s*:\s*(.+?)\s*$", re.MULTILINE)
UNSAFE_PATTERNS = (
    ".env",
    "~/.ssh",
    "~/.aws",
    "rm -rf",
    "danger-full-access",
    "dangerously-bypass-approvals-and-sandbox",
    "git push",
    "deploy",
    "sudo",
)


@dataclass
class RoundResult:
    round_number: int
    status: str
    summary: str
    next_action: str
    final_message_path: Path
    stdout_path: Path
    stderr_path: Path
    return_code: int


def ensure_layout() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def read_task() -> str:
    if not TASK_FILE.exists():
        raise FileNotFoundError(f"Task file not found: {TASK_FILE}")
    return TASK_FILE.read_text(encoding="utf-8").strip()


def run_git_command(args: List[str]) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        return f"[git {' '.join(args)} failed with code {proc.returncode}]\n{proc.stderr.strip()}".strip()
    return proc.stdout.strip()


def current_context_block() -> str:
    git_status = run_git_command(["status", "--short"])
    diff_stat = run_git_command(["diff", "--stat"])
    diff_names = run_git_command(["diff", "--name-only"])
    return "\n".join(
        [
            "## Current Repo Context",
            "",
            "### git status --short",
            git_status or "(no output)",
            "",
            "### git diff --stat",
            diff_stat or "(no output)",
            "",
            "### git diff --name-only",
            diff_names or "(no output)",
        ]
    )


def safety_block() -> str:
    items = "\n".join(f"- Never use or request `{item}`." for item in UNSAFE_PATTERNS)
    return "\n".join(
        [
            "## Safety Rules",
            "- Stay inside the current repository.",
            "- You may edit code, run local validation, inspect git status, and inspect diffs.",
            "- Do not use network access unless the environment already explicitly allows it.",
            "- Do not commit, push, deploy, or perform production actions.",
            "- If a risky or privileged action would be required, stop and explain the blocker instead.",
            items,
        ]
    )


def prompt_contract() -> str:
    return "\n".join(
        [
            "## Response Contract",
            "At the very end of your final message, include exactly these lines:",
            "DELIVERY_STATUS: DONE | NEEDS_MORE_ROUNDS | BLOCKED",
            "ROUND_SUMMARY: one concise paragraph",
            "NEXT_ACTION: one concise sentence",
            "",
            "Use `DONE` only when the repository work is complete and locally validated as far as practical.",
            "Use `NEEDS_MORE_ROUNDS` when more implementation work remains.",
            "Use `BLOCKED` only when human input or forbidden access is required.",
        ]
    )


def build_prompt(task_text: str, round_number: int, previous: RoundResult | None) -> str:
    parts = [
        "You are the implementation agent for this repository.",
        "Complete as much of the task as possible in this round without asking whether to continue.",
        "",
        "## Task File",
        task_text,
        "",
        safety_block(),
        "",
        current_context_block(),
        "",
    ]
    if previous is not None:
        parts.extend(
            [
                "## Previous Round Summary",
                f"Round: {previous.round_number}",
                f"Status: {previous.status}",
                f"Summary: {previous.summary}",
                f"Next action suggested: {previous.next_action}",
                "",
            ]
        )
    parts.extend(
        [
            prompt_contract(),
            "",
            f"## Round Instruction",
            f"This is round {round_number}. Make concrete repository progress now.",
        ]
    )
    return "\n".join(parts).strip()


def parse_final_message(message: str) -> tuple[str, str, str]:
    raw_status = None
    status_match = STATUS_PATTERN.search(message)
    if status_match:
        raw_status = status_match.group(1).strip().upper()

    summary_match = SUMMARY_PATTERN.search(message)
    next_action_match = NEXT_ACTION_PATTERN.search(message)

    summary = summary_match.group(1).strip() if summary_match else fallback_summary(message)
    next_action = next_action_match.group(1).strip() if next_action_match else "Review the latest repository state and continue if needed."

    normalized = normalize_status(raw_status, message)
    return normalized, summary, next_action


def normalize_status(raw_status: str | None, message: str) -> str:
    if raw_status == "DONE":
        return "done"
    if raw_status == "NEEDS_MORE_ROUNDS":
        return "needs_more_rounds"
    if raw_status == "BLOCKED":
        return "blocked"

    lowered = message.lower()
    if "blocked" in lowered or "need human" in lowered or "requires approval" in lowered:
        return "blocked"
    if any(token in lowered for token in ("completed", "done", "finished")):
        return "done"
    return "needs_more_rounds"


def fallback_summary(message: str) -> str:
    compact = " ".join(line.strip() for line in message.splitlines() if line.strip())
    if not compact:
        return "No summary returned."
    return compact[:280]


def run_round(round_number: int, task_text: str, previous: RoundResult | None) -> RoundResult:
    final_message_path = REPORTS_DIR / f"codex-round-{round_number}-final.md"
    stdout_path = LOGS_DIR / f"codex-round-{round_number}.jsonl"
    stderr_path = LOGS_DIR / f"codex-round-{round_number}.stderr.log"
    prompt = build_prompt(task_text, round_number, previous)

    cmd = [
        "codex",
        "exec",
        "--full-auto",
        "--json",
        "--output-last-message",
        str(final_message_path),
        prompt,
    ]

    print(f"[ai-team] starting round {round_number}: {shlex.join(cmd[:6])} ...", flush=True)
    proc = subprocess.run(
        cmd,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    stdout_path.write_text(proc.stdout, encoding="utf-8")
    stderr_path.write_text(proc.stderr, encoding="utf-8")

    final_message = final_message_path.read_text(encoding="utf-8") if final_message_path.exists() else ""
    status, summary, next_action = parse_final_message(final_message)

    if proc.returncode != 0 and status == "done":
        status = "needs_more_rounds"
        summary = f"Codex exited with code {proc.returncode}. {summary}"

    print(f"[ai-team] finished round {round_number} with status={status}", flush=True)
    return RoundResult(
        round_number=round_number,
        status=status,
        summary=summary,
        next_action=next_action,
        final_message_path=final_message_path,
        stdout_path=stdout_path,
        stderr_path=stderr_path,
        return_code=proc.returncode,
    )


def build_report(rounds: List[RoundResult], overall_status: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = REPORTS_DIR / f"delivery-{timestamp}.md"
    git_status = run_git_command(["status", "--short"])
    diff_stat = run_git_command(["diff", "--stat"])

    lines = [
        "# AI Delivery Report",
        "",
        f"- Generated at: {datetime.now().isoformat(timespec='seconds')}",
        f"- Task file: `{TASK_FILE}`",
        f"- Overall status: `{overall_status}`",
        f"- Rounds run: `{len(rounds)}`",
        "",
        "## Round Summaries",
        "",
    ]

    for result in rounds:
        lines.extend(
            [
                f"### Round {result.round_number}",
                f"- Status: `{result.status}`",
                f"- Summary: {result.summary}",
                f"- Next action: {result.next_action}",
                f"- Final message: `{result.final_message_path}`",
                f"- Stdout log: `{result.stdout_path}`",
                f"- Stderr log: `{result.stderr_path}`",
                f"- Return code: `{result.return_code}`",
                "",
            ]
        )

    lines.extend(
        [
            "## Final git status --short",
            "```text",
            git_status or "(no output)",
            "```",
            "",
            "## Final git diff --stat",
            "```text",
            diff_stat or "(no output)",
            "```",
            "",
        ]
    )

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> int:
    ensure_layout()
    try:
        task_text = read_task()
    except FileNotFoundError as exc:
        print(f"[ai-team] {exc}", file=sys.stderr)
        return 1

    max_rounds = int(os.environ.get("AI_TEAM_MAX_ROUNDS", DEFAULT_MAX_ROUNDS))
    previous = None
    rounds: List[RoundResult] = []
    overall_status = "max_rounds_reached"

    for round_number in range(1, max_rounds + 1):
        result = run_round(round_number, task_text, previous)
        rounds.append(result)
        previous = result

        if result.status == "done":
            overall_status = "done"
            break
        if result.status == "blocked":
            overall_status = "blocked"
            break

    report_path = build_report(rounds, overall_status)
    print(f"[ai-team] report written to {report_path}")
    return 0 if overall_status == "done" else 2


if __name__ == "__main__":
    raise SystemExit(main())
