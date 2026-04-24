from __future__ import annotations

from pathlib import Path


APP_NAME = "AppliMate"
BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "applimate.db"
VAULT_DIR = BASE_DIR / "AppliMate_Vault"

VAULT_CATEGORIES = {
    "IELTS": VAULT_DIR / "IELTS",
    "TOEFL": VAULT_DIR / "TOEFL",
    "Applications": VAULT_DIR / "Applications",
    "Personal_Profile": VAULT_DIR / "Personal_Profile",
    "Portfolios": VAULT_DIR / "Portfolios",
    "Notes": VAULT_DIR / "Notes",
}

TASK_STATUSES = ["未开始", "进行中", "已完成"]
APPLICATION_STATUSES = ["未开始", "材料准备中", "已递交", "录取", "拒信"]
INSTITUTION_TIERS = ["冲刺", "主申", "保底"]
SUBJECTS = ["IELTS", "TOEFL", "GRE", "专业课", "申请材料"]
TASK_PRIORITIES = ["低", "中", "高"]
