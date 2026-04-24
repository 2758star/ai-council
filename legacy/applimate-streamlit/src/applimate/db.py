from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from .config import (
    APPLICATION_STATUSES,
    DB_PATH,
    INSTITUTION_TIERS,
    TASK_STATUSES,
    VAULT_CATEGORIES,
)


def bootstrap_storage() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    for folder in VAULT_CATEGORIES.values():
        folder.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    bootstrap_storage()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    bootstrap_storage()
    with closing(get_connection()) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS institutions (
                inst_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                tier TEXT NOT NULL CHECK(tier IN ('冲刺', '主申', '保底')),
                portal_link TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS applications (
                app_id INTEGER PRIMARY KEY AUTOINCREMENT,
                inst_id INTEGER NOT NULL,
                program_name TEXT NOT NULL,
                degree_type TEXT NOT NULL DEFAULT 'Master',
                intake_term TEXT,
                deadline TEXT,
                status TEXT NOT NULL DEFAULT '未开始'
                    CHECK(status IN ('未开始', '材料准备中', '已递交', '录取', '拒信')),
                progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inst_id) REFERENCES institutions(inst_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS schedule_tasks (
                task_id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                scheduled_time TEXT,
                status TEXT NOT NULL DEFAULT '未开始'
                    CHECK(status IN ('未开始', '进行中', '已完成')),
                priority TEXT NOT NULL DEFAULT '中' CHECK(priority IN ('低', '中', '高')),
                source TEXT,
                calendar_sync_id TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mistake_log (
                mistake_id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                question_type TEXT NOT NULL,
                content_desc TEXT NOT NULL,
                source TEXT,
                tags TEXT,
                review_after TEXT,
                logged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS local_files (
                file_id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                local_path TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                file_type TEXT,
                linked_app_id INTEGER,
                note TEXT,
                added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (linked_app_id) REFERENCES applications(app_id) ON DELETE SET NULL
            );
            """
        )
        conn.commit()


def execute(query: str, params: tuple[Any, ...] = ()) -> None:
    with closing(get_connection()) as conn:
        conn.execute(query, params)
        conn.commit()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    with closing(get_connection()) as conn:
        rows = conn.execute(query, params).fetchall()
    return rows


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    with closing(get_connection()) as conn:
        row = conn.execute(query, params).fetchone()
    return row


def create_institution(name: str, tier: str, portal_link: str, notes: str) -> None:
    if tier not in INSTITUTION_TIERS:
        raise ValueError("Unsupported institution tier")
    execute(
        """
        INSERT INTO institutions (name, tier, portal_link, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            tier = excluded.tier,
            portal_link = excluded.portal_link,
            notes = excluded.notes
        """,
        (name.strip(), tier, portal_link.strip(), notes.strip()),
    )


def list_institutions() -> list[sqlite3.Row]:
    return fetch_all(
        """
        SELECT inst_id, name, tier, portal_link, notes, created_at
        FROM institutions
        ORDER BY
            CASE tier
                WHEN '冲刺' THEN 1
                WHEN '主申' THEN 2
                ELSE 3
            END,
            name COLLATE NOCASE
        """
    )


def create_application(
    inst_id: int,
    program_name: str,
    degree_type: str,
    intake_term: str,
    deadline: str,
    status: str,
    progress: int,
    notes: str,
) -> None:
    if status not in APPLICATION_STATUSES:
        raise ValueError("Unsupported application status")
    execute(
        """
        INSERT INTO applications (
            inst_id, program_name, degree_type, intake_term, deadline, status, progress, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            inst_id,
            program_name.strip(),
            degree_type.strip() or "Master",
            intake_term.strip(),
            deadline,
            status,
            progress,
            notes.strip(),
        ),
    )


def list_applications() -> list[sqlite3.Row]:
    return fetch_all(
        """
        SELECT
            a.app_id,
            i.name AS institution_name,
            i.tier,
            a.program_name,
            a.degree_type,
            a.intake_term,
            a.deadline,
            a.status,
            a.progress,
            a.notes,
            a.created_at
        FROM applications a
        JOIN institutions i ON i.inst_id = a.inst_id
        ORDER BY
            CASE a.status
                WHEN '材料准备中' THEN 1
                WHEN '未开始' THEN 2
                WHEN '已递交' THEN 3
                WHEN '录取' THEN 4
                ELSE 5
            END,
            a.deadline IS NULL,
            a.deadline ASC
        """
    )


def list_application_options() -> list[tuple[int, str]]:
    rows = fetch_all(
        """
        SELECT a.app_id, i.name || ' - ' || a.program_name AS label
        FROM applications a
        JOIN institutions i ON i.inst_id = a.inst_id
        ORDER BY i.name, a.program_name
        """
    )
    return [(row["app_id"], row["label"]) for row in rows]


def create_task(
    title: str,
    scheduled_time: str | None,
    status: str,
    priority: str,
    source: str,
    notes: str,
) -> None:
    if status not in TASK_STATUSES:
        raise ValueError("Unsupported task status")
    execute(
        """
        INSERT INTO schedule_tasks (title, scheduled_time, status, priority, source, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            title.strip(),
            scheduled_time,
            status,
            priority,
            source.strip(),
            notes.strip(),
        ),
    )


def update_task_status(task_id: int, status: str) -> None:
    if status not in TASK_STATUSES:
        raise ValueError("Unsupported task status")
    execute("UPDATE schedule_tasks SET status = ? WHERE task_id = ?", (status, task_id))


def list_tasks() -> list[sqlite3.Row]:
    return fetch_all(
        """
        SELECT task_id, title, scheduled_time, status, priority, source, notes, created_at
        FROM schedule_tasks
        ORDER BY
            CASE status
                WHEN '未开始' THEN 1
                WHEN '进行中' THEN 2
                ELSE 3
            END,
            scheduled_time IS NULL,
            scheduled_time ASC,
            created_at DESC
        """
    )


def create_mistake(
    subject: str,
    question_type: str,
    content_desc: str,
    source: str,
    tags: str,
    review_after: str | None,
) -> None:
    execute(
        """
        INSERT INTO mistake_log (subject, question_type, content_desc, source, tags, review_after)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            subject.strip(),
            question_type.strip(),
            content_desc.strip(),
            source.strip(),
            tags.strip(),
            review_after,
        ),
    )


def list_mistakes() -> list[sqlite3.Row]:
    return fetch_all(
        """
        SELECT mistake_id, subject, question_type, content_desc, source, tags, review_after, logged_at
        FROM mistake_log
        ORDER BY logged_at DESC
        """
    )


def due_mistakes() -> list[sqlite3.Row]:
    today = date.today().isoformat()
    return fetch_all(
        """
        SELECT mistake_id, subject, question_type, content_desc, review_after, logged_at
        FROM mistake_log
        WHERE review_after IS NOT NULL AND review_after <= ?
        ORDER BY review_after ASC, logged_at DESC
        """,
        (today,),
    )


def create_file_record(
    file_name: str,
    local_path: str,
    category: str,
    file_type: str,
    linked_app_id: int | None,
    note: str,
) -> None:
    execute(
        """
        INSERT INTO local_files (file_name, local_path, category, file_type, linked_app_id, note)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(local_path) DO UPDATE SET
            file_name = excluded.file_name,
            category = excluded.category,
            file_type = excluded.file_type
        """,
        (file_name, local_path, category, file_type, linked_app_id, note.strip()),
    )


def list_files(category: str | None = None) -> list[sqlite3.Row]:
    if category and category != "全部":
        return fetch_all(
            """
            SELECT
                f.file_id,
                f.file_name,
                f.local_path,
                f.category,
                f.file_type,
                f.note,
                f.added_at,
                i.name || ' - ' || a.program_name AS linked_application
            FROM local_files f
            LEFT JOIN applications a ON a.app_id = f.linked_app_id
            LEFT JOIN institutions i ON i.inst_id = a.inst_id
            WHERE f.category = ?
            ORDER BY f.added_at DESC
            """,
            (category,),
        )
    return fetch_all(
        """
        SELECT
            f.file_id,
            f.file_name,
            f.local_path,
            f.category,
            f.file_type,
            f.note,
            f.added_at,
            i.name || ' - ' || a.program_name AS linked_application
        FROM local_files f
        LEFT JOIN applications a ON a.app_id = f.linked_app_id
        LEFT JOIN institutions i ON i.inst_id = a.inst_id
        ORDER BY f.added_at DESC
        """
    )


def get_file(file_id: int) -> sqlite3.Row | None:
    return fetch_one(
        """
        SELECT
            f.file_id,
            f.file_name,
            f.local_path,
            f.category,
            f.file_type,
            f.note,
            f.added_at,
            i.name || ' - ' || a.program_name AS linked_application
        FROM local_files f
        LEFT JOIN applications a ON a.app_id = f.linked_app_id
        LEFT JOIN institutions i ON i.inst_id = a.inst_id
        WHERE f.file_id = ?
        """,
        (file_id,),
    )


def dashboard_snapshot() -> dict[str, Any]:
    today = date.today()
    next_two_weeks = today + timedelta(days=14)

    counts = fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM institutions) AS institutions_count,
            (SELECT COUNT(*) FROM applications) AS applications_count,
            (SELECT COUNT(*) FROM schedule_tasks WHERE status != '已完成') AS open_tasks_count,
            (SELECT COUNT(*) FROM local_files) AS files_count
        """
    )

    deadlines = fetch_all(
        """
        SELECT
            i.name AS institution_name,
            a.program_name,
            a.deadline,
            a.status,
            CAST(julianday(a.deadline) - julianday('now') AS INTEGER) AS days_left
        FROM applications a
        JOIN institutions i ON i.inst_id = a.inst_id
        WHERE a.deadline IS NOT NULL
        ORDER BY a.deadline ASC
        LIMIT 5
        """
    )

    urgent = [
        row
        for row in deadlines
        if row["deadline"] and today.isoformat() <= row["deadline"] <= next_two_weeks.isoformat()
    ]

    recent_mistakes = fetch_all(
        """
        SELECT subject, question_type, content_desc, logged_at
        FROM mistake_log
        ORDER BY logged_at DESC
        LIMIT 5
        """
    )

    task_status = fetch_all(
        """
        SELECT status, COUNT(*) AS count
        FROM schedule_tasks
        GROUP BY status
        """
    )

    file_categories = fetch_all(
        """
        SELECT category, COUNT(*) AS count
        FROM local_files
        GROUP BY category
        ORDER BY count DESC, category ASC
        """
    )

    return {
        "counts": dict(counts or {}),
        "deadlines": deadlines,
        "urgent_deadlines": urgent,
        "recent_mistakes": recent_mistakes,
        "task_status": task_status,
        "file_categories": file_categories,
        "due_mistakes": due_mistakes(),
        "today": today,
        "generated_at": datetime.now(),
    }
