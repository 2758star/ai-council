# AppliMate

AppliMate is a local-first application management workspace for IELTS/TOEFL prep, graduate applications, personal documents, and portfolio assets.

It runs fully on your machine with:

- `Streamlit` for the UI
- `SQLite` for structured data
- a local `AppliMate_Vault/` folder for documents, videos, and notes
- optional `Feishu` webhook integration for reminders

## Features

- Application dashboard for schools, programs, deadlines, and status
- Schedule board for study plans and application tasks
- Mistake book for IELTS/TOEFL/GRE review notes
- Local library for study materials, personal records, and portfolio files
- In-app preview for images, video, audio, text, CSV, JSON, PDF, and DOCX excerpts
- No cloud dependency required for normal usage

## Project Structure

```text
applimate/
├── app.py
├── data/
├── AppliMate_Vault/
│   ├── IELTS/
│   ├── TOEFL/
│   ├── Applications/
│   ├── Personal_Profile/
│   ├── Portfolios/
│   └── Notes/
└── src/applimate/
```

## Quick Start

1. Create a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the app:

```bash
streamlit run app.py
```

4. Open the local URL shown in the terminal, usually:

```text
http://localhost:8501
```

## Optional Feishu Integration

If you want reminder pushes in Feishu, set an incoming webhook URL before launching:

```bash
export FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
```

The app still works normally without this value.

## Notes

- All uploaded files are stored locally in `AppliMate_Vault/`.
- The SQLite database lives at `data/applimate.db`.
- DOCX preview uses text extraction instead of full Word rendering, so it stays local and lightweight.
