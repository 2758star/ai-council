from __future__ import annotations

import base64
import sys
from datetime import date, datetime, time
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from applimate.config import (  # noqa: E402
    APP_NAME,
    APPLICATION_STATUSES,
    INSTITUTION_TIERS,
    SUBJECTS,
    TASK_PRIORITIES,
    TASK_STATUSES,
    VAULT_CATEGORIES,
    VAULT_DIR,
)
from applimate.db import (  # noqa: E402
    bootstrap_storage,
    create_application,
    create_file_record,
    create_institution,
    create_mistake,
    create_task,
    dashboard_snapshot,
    get_file,
    init_db,
    list_application_options,
    list_applications,
    list_files,
    list_institutions,
    list_mistakes,
    list_tasks,
    update_task_status,
)
from applimate.services.feishu import get_webhook_url, send_text_message  # noqa: E402
from applimate.services.files import (  # noqa: E402
    detect_preview_kind,
    persist_uploaded_file,
    read_docx_excerpt,
    read_text_excerpt,
    sync_vault_to_database,
)


st.set_page_config(page_title=APP_NAME, layout="wide", initial_sidebar_state="expanded")


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(196, 230, 214, 0.95), rgba(246, 248, 244, 0.95) 42%),
                linear-gradient(135deg, #f6f8f4 0%, #eef3e8 100%);
        }
        .block-container {
            padding-top: 1.5rem;
            padding-bottom: 2rem;
        }
        div[data-testid="stMetricValue"] {
            font-size: 2rem;
        }
        .card {
            background: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(20, 40, 29, 0.08);
            border-radius: 18px;
            padding: 1rem 1.1rem;
            box-shadow: 0 12px 30px rgba(20, 40, 29, 0.06);
            margin-bottom: 0.85rem;
        }
        .card.urgent {
            border: 1px solid rgba(176, 36, 24, 0.4);
            box-shadow: 0 12px 24px rgba(176, 36, 24, 0.12);
        }
        .eyebrow {
            color: #46624d;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .hero {
            padding: 1.2rem 1.4rem;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(15, 118, 110, 0.94), rgba(32, 94, 70, 0.94));
            color: white;
            box-shadow: 0 18px 40px rgba(15, 118, 110, 0.2);
            margin-bottom: 1rem;
        }
        .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_state() -> None:
    bootstrap_storage()
    init_db()
    if "selected_file_id" not in st.session_state:
        st.session_state.selected_file_id = None


def format_dataframe(rows) -> pd.DataFrame:
    return pd.DataFrame([dict(row) for row in rows]) if rows else pd.DataFrame()


def render_header() -> None:
    st.markdown(
        """
        <div class="hero">
            <div class="eyebrow">Local-First Graduate Application OS</div>
            <h1 style="margin: 0.25rem 0 0.35rem 0;">AppliMate</h1>
            <p style="margin: 0; font-size: 1rem;">
                在本地管理语言备考、申请进度、资料库和作品集，不依赖云端也能完整运作。
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def sidebar_controls() -> str:
    with st.sidebar:
        st.title("AppliMate")
        st.caption("本地优先申请管家")
        page = st.radio(
            "导航",
            ["总览", "申请大盘", "日程计划", "错题本", "资料库", "设置"],
            label_visibility="collapsed",
        )
        st.divider()
        st.markdown("**资料库位置**")
        st.code(str(VAULT_DIR))
        st.markdown("**数据库**")
        st.code(str(ROOT_DIR / "data" / "applimate.db"))
    return page


def render_dashboard() -> None:
    snapshot = dashboard_snapshot()
    counts = snapshot["counts"]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("院校数量", counts.get("institutions_count", 0))
    c2.metric("申请项目", counts.get("applications_count", 0))
    c3.metric("未完成任务", counts.get("open_tasks_count", 0))
    c4.metric("资料文件", counts.get("files_count", 0))

    left, right = st.columns([1.3, 1])
    with left:
        st.subheader("近期 Deadline")
        deadlines = snapshot["deadlines"]
        if not deadlines:
            st.info("还没有项目截止日期，先去“申请大盘”录入学校和项目。")
        for row in deadlines:
            urgent = row["deadline"] and row["days_left"] is not None and row["days_left"] <= 14
            class_name = "card urgent" if urgent else "card"
            days_text = f"{row['days_left']} 天" if row["days_left"] is not None else "待定"
            st.markdown(
                f"""
                <div class="{class_name}">
                    <div class="eyebrow">{row["status"]}</div>
                    <div style="font-size: 1.1rem; font-weight: 700;">{row["institution_name"]} · {row["program_name"]}</div>
                    <div>截止日期：{row["deadline"] or "未填写"} ｜ 倒计时：{days_text}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.subheader("今日应复习错题")
        due_rows = snapshot["due_mistakes"]
        if due_rows:
            due_df = format_dataframe(due_rows)
            st.dataframe(due_df, use_container_width=True, hide_index=True)
        else:
            st.success("今天没有到期的复习项。")

    with right:
        st.subheader("任务分布")
        task_status = format_dataframe(snapshot["task_status"])
        if not task_status.empty:
            st.bar_chart(task_status.set_index("status"))
        else:
            st.info("还没有任务数据。")

        st.subheader("资料类别")
        file_categories = format_dataframe(snapshot["file_categories"])
        if not file_categories.empty:
            st.bar_chart(file_categories.set_index("category"))
        else:
            st.info("资料库还没有文件。")

        st.subheader("最近错题")
        recent_mistakes = snapshot["recent_mistakes"]
        if recent_mistakes:
            for row in recent_mistakes:
                st.markdown(
                    f"""
                    <div class="card">
                        <div class="eyebrow">{row["subject"]} · {row["question_type"]}</div>
                        <div>{row["content_desc"]}</div>
                        <div style="color: #46624d; margin-top: 0.35rem;">记录时间：{row["logged_at"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
        else:
            st.info("还没有错题记录。")


def render_application_hub() -> None:
    st.subheader("院校与申请项目")
    form_left, form_right = st.columns(2)

    with form_left:
        with st.form("institution_form", clear_on_submit=True):
            st.markdown("**新增或更新院校**")
            name = st.text_input("院校名称", placeholder="Imperial College London")
            tier = st.selectbox("梯队", INSTITUTION_TIERS)
            portal_link = st.text_input("Portal 链接", placeholder="https://...")
            notes = st.text_area("备注", placeholder="奖学金、导师偏好、项目特色")
            submitted = st.form_submit_button("保存院校")
            if submitted:
                if not name.strip():
                    st.error("院校名称不能为空。")
                else:
                    create_institution(name, tier, portal_link, notes)
                    st.success("院校信息已保存。")
                    st.rerun()

    with form_right:
        institutions = list_institutions()
        institution_options = {f"{row['name']} ({row['tier']})": row["inst_id"] for row in institutions}
        with st.form("application_form", clear_on_submit=True):
            st.markdown("**新增申请项目**")
            if institution_options:
                chosen_label = st.selectbox("所属院校", list(institution_options.keys()))
            else:
                chosen_label = None
                st.info("请先在左侧添加院校。")
            program_name = st.text_input("项目名称", placeholder="MSc Computer Science")
            degree_type = st.text_input("学位类型", value="Master")
            intake_term = st.text_input("入学批次", placeholder="2027 Fall")
            has_deadline = st.checkbox("设置截止日期", value=True)
            deadline = st.date_input("截止日期", value=date.today()) if has_deadline else None
            status = st.selectbox("当前状态", APPLICATION_STATUSES)
            progress = st.slider("当前进度", min_value=0, max_value=100, value=10)
            notes = st.text_area("项目备注", placeholder="文书要求、推荐信情况、面试安排")
            submitted = st.form_submit_button("保存项目")
            if submitted:
                if not institution_options:
                    st.error("请先创建院校。")
                elif not program_name.strip():
                    st.error("项目名称不能为空。")
                else:
                    deadline_value = deadline.isoformat() if isinstance(deadline, date) else ""
                    create_application(
                        inst_id=institution_options[chosen_label],
                        program_name=program_name,
                        degree_type=degree_type,
                        intake_term=intake_term,
                        deadline=deadline_value,
                        status=status,
                        progress=progress,
                        notes=notes,
                    )
                    st.success("申请项目已保存。")
                    st.rerun()

    st.divider()
    apps_df = format_dataframe(list_applications())
    inst_df = format_dataframe(list_institutions())

    grid_left, grid_right = st.columns([1.2, 1])
    with grid_left:
        st.markdown("**申请项目总表**")
        if apps_df.empty:
            st.info("还没有申请项目。")
        else:
            st.dataframe(apps_df, use_container_width=True, hide_index=True)

    with grid_right:
        st.markdown("**院校总表**")
        if inst_df.empty:
            st.info("还没有院校记录。")
        else:
            st.dataframe(inst_df, use_container_width=True, hide_index=True)


def render_schedule() -> None:
    st.subheader("日程计划")
    create_col, board_col = st.columns([0.8, 1.2])

    with create_col:
        with st.form("task_form", clear_on_submit=True):
            st.markdown("**新增任务**")
            title = st.text_input("任务标题", placeholder="明早背 200 个 TOEFL 单词")
            has_schedule = st.checkbox("设置执行时间", value=True)
            if has_schedule:
                task_date = st.date_input("执行日期", value=date.today())
                task_time = st.time_input("执行时间", value=time(8, 0))
            else:
                task_date = None
                task_time = None
            status = st.selectbox("状态", TASK_STATUSES)
            priority = st.selectbox("优先级", TASK_PRIORITIES, index=1)
            source = st.text_input("来源", placeholder="IELTS / TOEFL / Application")
            notes = st.text_area("备注", placeholder="具体目标、复习范围、材料位置")
            submitted = st.form_submit_button("保存任务")
            if submitted:
                if not title.strip():
                    st.error("任务标题不能为空。")
                else:
                    scheduled = None
                    if isinstance(task_date, date) and task_time is not None:
                        scheduled = datetime.combine(task_date, task_time).isoformat(timespec="minutes")
                    create_task(title, scheduled, status, priority, source, notes)
                    st.success("任务已加入计划。")
                    st.rerun()

    with board_col:
        tasks = list_tasks()
        if not tasks:
            st.info("还没有任务，先创建一条你的备考或申请计划。")
            return
        columns = st.columns(3)
        for idx, label in enumerate(TASK_STATUSES):
            with columns[idx]:
                st.markdown(f"**{label}**")
                for row in tasks:
                    if row["status"] != label:
                        continue
                    with st.container(border=True):
                        st.markdown(f"**{row['title']}**")
                        st.caption(
                            f"时间：{row['scheduled_time'] or '待定'} ｜ 优先级：{row['priority']} ｜ 来源：{row['source'] or '未标注'}"
                        )
                        if row["notes"]:
                            st.write(row["notes"])
                        next_statuses = [s for s in TASK_STATUSES if s != row["status"]]
                        chosen = st.selectbox(
                            f"更新状态 #{row['task_id']}",
                            [row["status"]] + next_statuses,
                            key=f"task-status-{row['task_id']}",
                            label_visibility="collapsed",
                        )
                        if chosen != row["status"]:
                            update_task_status(row["task_id"], chosen)
                            st.rerun()


def render_mistakes() -> None:
    st.subheader("错题本")
    entry_col, list_col = st.columns([0.85, 1.15])
    with entry_col:
        with st.form("mistake_form", clear_on_submit=True):
            st.markdown("**记录错题**")
            subject = st.selectbox("科目", SUBJECTS)
            question_type = st.text_input("题型", placeholder="阅读匹配 / 听力细节题 / 综合写作")
            content_desc = st.text_area("错误原因或题目摘要", placeholder="长难句没拆开、定位慢、词汇不熟")
            source = st.text_input("来源", placeholder="剑雅 18 Test 3 / Official TOEFL Guide")
            tags = st.text_input("标签", placeholder="长难句, 定位, 词汇")
            has_review_after = st.checkbox("设置下次复习日期", value=True)
            review_after = st.date_input("下次复习日期", value=date.today()) if has_review_after else None
            submitted = st.form_submit_button("保存错题")
            if submitted:
                if not question_type.strip() or not content_desc.strip():
                    st.error("题型和摘要都需要填写。")
                else:
                    review_value = review_after.isoformat() if isinstance(review_after, date) else None
                    create_mistake(subject, question_type, content_desc, source, tags, review_value)
                    st.success("错题已记录。")
                    st.rerun()

    with list_col:
        mistakes_df = format_dataframe(list_mistakes())
        if mistakes_df.empty:
            st.info("还没有错题记录。")
        else:
            st.dataframe(mistakes_df, use_container_width=True, hide_index=True)


def render_pdf(path: Path) -> None:
    encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    pdf_display = f"""
    <iframe
        src="data:application/pdf;base64,{encoded}"
        width="100%"
        height="700"
        type="application/pdf"
        style="border: none; border-radius: 14px; background: white;"
    ></iframe>
    """
    st.components.v1.html(pdf_display, height=720)


def render_file_preview(file_row) -> None:
    if not file_row:
        st.info("从左侧列表中选择一个文件后，这里会显示预览。")
        return

    path = Path(file_row["local_path"])
    st.markdown("**当前预览**")
    st.write(file_row["file_name"])
    st.caption(str(path))
    if file_row["linked_application"]:
        st.caption(f"关联项目：{file_row['linked_application']}")
    if file_row["note"]:
        st.write(file_row["note"])

    if not path.exists():
        st.error("文件不存在，可能已被移动或删除。")
        return

    kind = detect_preview_kind(path)
    if kind == "image":
        st.image(str(path), use_container_width=True)
    elif kind == "video":
        st.video(str(path))
    elif kind == "audio":
        st.audio(str(path))
    elif kind == "text":
        st.code(read_text_excerpt(path), language=None)
    elif kind == "csv":
        st.dataframe(pd.read_csv(path), use_container_width=True)
    elif kind == "pdf":
        render_pdf(path)
    elif kind == "docx":
        st.text_area("DOCX 文本预览", read_docx_excerpt(path), height=500)
    else:
        st.warning("当前格式暂不支持内嵌预览，但文件已经安全保存在本地资料库中。")

    st.download_button("下载文件", data=path.read_bytes(), file_name=path.name, use_container_width=True)


def render_library() -> None:
    st.subheader("资料库")
    upload_col, preview_col = st.columns([0.95, 1.05])

    with upload_col:
        st.markdown("**上传到本地资料库**")
        if st.button("扫描资料库目录并同步", use_container_width=True):
            synced = sync_vault_to_database()
            st.success(f"已扫描资料库，共处理 {synced} 个文件。")
            st.rerun()
        app_options = {label: app_id for app_id, label in list_application_options()}
        app_labels = ["不关联项目"] + list(app_options.keys())
        with st.form("upload_form", clear_on_submit=True):
            category = st.selectbox("资料分类", list(VAULT_CATEGORIES.keys()))
            linked_label = st.selectbox("关联申请项目", app_labels)
            note = st.text_area("备注", placeholder="版本、用途、复习重点、作品说明")
            uploaded = st.file_uploader(
                "选择文件",
                accept_multiple_files=False,
                type=None,
                help="支持文档、图片、视频、音频、表格等常见格式。",
            )
            submitted = st.form_submit_button("保存文件")
            if submitted:
                if uploaded is None:
                    st.error("请先选择一个文件。")
                else:
                    saved_path, mime_type = persist_uploaded_file(category, uploaded)
                    linked_id = None if linked_label == "不关联项目" else app_options[linked_label]
                    create_file_record(
                        file_name=saved_path.name,
                        local_path=str(saved_path),
                        category=category,
                        file_type=mime_type,
                        linked_app_id=linked_id,
                        note=note,
                    )
                    st.success(f"文件已保存到 {saved_path}")
                    st.rerun()

        st.divider()
        st.markdown("**浏览文件列表**")
        file_filter = st.selectbox("筛选分类", ["全部"] + list(VAULT_CATEGORIES.keys()))
        files = list_files(file_filter)
        if not files:
            st.info("这个分类下还没有文件。")
        else:
            for row in files:
                with st.container(border=True):
                    st.markdown(f"**{row['file_name']}**")
                    st.caption(f"{row['category']} ｜ {row['file_type'] or '未知格式'} ｜ {row['added_at']}")
                    st.caption(row["linked_application"] or "未关联项目")
                    if st.button("预览", key=f"preview-{row['file_id']}", use_container_width=True):
                        st.session_state.selected_file_id = row["file_id"]
                        st.rerun()

    with preview_col:
        selected_row = None
        if st.session_state.selected_file_id is not None:
            selected_row = get_file(st.session_state.selected_file_id)
        render_file_preview(selected_row)


def render_settings() -> None:
    st.subheader("设置与集成")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**本地存储**")
        st.write(f"资料库根目录：`{VAULT_DIR}`")
        for name, path in VAULT_CATEGORIES.items():
            st.write(f"- {name}: `{path}`")
        st.write(f"数据库：`{ROOT_DIR / 'data' / 'applimate.db'}`")

    with c2:
        st.markdown("**飞书接入**")
        webhook = get_webhook_url()
        if webhook:
            st.success("已检测到 FEISHU_WEBHOOK_URL，可直接推送提醒。")
        else:
            st.info("当前未配置飞书 webhook。应用仍可独立本地使用。")
        sample_message = st.text_area(
            "飞书测试消息",
            value="AppliMate 提醒：今天记得复习 TOEFL 阅读错题，并检查本周申请截止日期。",
            height=120,
        )
        if st.button("发送飞书测试消息", use_container_width=True):
            success, detail = send_text_message(sample_message)
            if success:
                st.success(detail)
            else:
                st.error(detail)

    st.divider()
    st.markdown("**建议的使用方式**")
    st.write("- 平时把资料直接上传到资料库，保持目录和数据库同步。")
    st.write("- 用“申请大盘”维护学校、项目、截止日期和当前进度。")
    st.write("- 用“日程计划”记录备考节奏和申请任务。")
    st.write("- 用“错题本”积累高频薄弱点，形成复习闭环。")


def main() -> None:
    inject_styles()
    init_state()
    render_header()
    page = sidebar_controls()

    if page == "总览":
        render_dashboard()
    elif page == "申请大盘":
        render_application_hub()
    elif page == "日程计划":
        render_schedule()
    elif page == "错题本":
        render_mistakes()
    elif page == "资料库":
        render_library()
    else:
        render_settings()


if __name__ == "__main__":
    main()
