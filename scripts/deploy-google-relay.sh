#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-asia-east1}"
SERVICE_NAME="${SERVICE_NAME:-psa-relay}"
FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-nam5}"
SCHEDULER_REGION="${SCHEDULER_REGION:-asia-east1}"
SCHEDULER_TZ="${SCHEDULER_TZ:-Asia/Shanghai}"
FEISHU_KEYWORD="${FEISHU_KEYWORD:-Mos提醒}"
CRON_SHARED_TOKEN="${CRON_SHARED_TOKEN:-}"
PSA_FEISHU_WEBHOOK_SECRET="${PSA_FEISHU_WEBHOOK_SECRET:-psa-feishu-webhook}"
PSA_GEMINI_SECRET="${PSA_GEMINI_SECRET:-gemini-key-psa}"
PSA_VERIFY_TOKEN_SECRET="${PSA_VERIFY_TOKEN_SECRET:-}"
PSA_CRON_TOKEN_SECRET="${PSA_CRON_TOKEN_SECRET:-psa-cron-shared-token}"
PSA_WEBHOOK_PATH_SECRET="${PSA_WEBHOOK_PATH_SECRET:-psa-feishu-webhook-path-secret}"
PSA_FEISHU_APP_ID_SECRET="${PSA_FEISHU_APP_ID_SECRET:-psa-feishu-app-id}"
PSA_FEISHU_APP_SECRET_SECRET="${PSA_FEISHU_APP_SECRET_SECRET:-psa-feishu-app-secret}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ 请先设置 PROJECT_ID，例如："
  echo "PROJECT_ID=your-project-id ./scripts/deploy-google-relay.sh"
  exit 1
fi

echo "==> 使用项目: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> 启用必需 API"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  iamcredentials.googleapis.com \
  artifactregistry.googleapis.com >/dev/null

echo "==> 检查 Firestore 默认数据库"
if ! gcloud firestore databases describe --database="(default)" >/dev/null 2>&1; then
  echo "   未检测到 Firestore 默认数据库，开始创建（location=${FIRESTORE_LOCATION}）"
  gcloud firestore databases create --database="(default)" --location="$FIRESTORE_LOCATION" --type=firestore-native
else
  echo "   Firestore 默认数据库已存在。"
fi

echo "==> 检查 Secret 是否已创建"
for secret_name in "$PSA_FEISHU_WEBHOOK_SECRET" "$PSA_GEMINI_SECRET"; do
  if ! gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
    echo "❌ 缺少 Secret: $secret_name"
    echo "   请先创建并写入值，例如："
    echo "   printf 'YOUR_VALUE' | gcloud secrets create $secret_name --data-file=-"
    exit 1
  fi
done

if ! gcloud secrets describe "$PSA_CRON_TOKEN_SECRET" >/dev/null 2>&1; then
  echo "==> 创建 CRON token secret: $PSA_CRON_TOKEN_SECRET"
  generated_cron_token="$(openssl rand -hex 24)"
  printf '%s' "$generated_cron_token" | gcloud secrets create "$PSA_CRON_TOKEN_SECRET" --data-file=-
else
  if [[ -n "$CRON_SHARED_TOKEN" ]]; then
    echo "==> 更新 CRON token secret: $PSA_CRON_TOKEN_SECRET"
    printf '%s' "$CRON_SHARED_TOKEN" | gcloud secrets versions add "$PSA_CRON_TOKEN_SECRET" --data-file=- >/dev/null
  fi
fi

if ! gcloud secrets describe "$PSA_WEBHOOK_PATH_SECRET" >/dev/null 2>&1; then
  echo "==> 创建 Feishu webhook path secret: $PSA_WEBHOOK_PATH_SECRET"
  generated_path_secret="$(openssl rand -hex 12)"
  printf '%s' "$generated_path_secret" | gcloud secrets create "$PSA_WEBHOOK_PATH_SECRET" --data-file=-
fi

if [[ -z "$PSA_VERIFY_TOKEN_SECRET" ]]; then
  PSA_VERIFY_TOKEN_SECRET="psa-feishu-verify-token"
fi
if ! gcloud secrets describe "$PSA_VERIFY_TOKEN_SECRET" >/dev/null 2>&1; then
  echo "==> 创建 Feishu verify token secret: $PSA_VERIFY_TOKEN_SECRET"
  generated_verify_token="$(openssl rand -hex 20)"
  printf '%s' "$generated_verify_token" | gcloud secrets create "$PSA_VERIFY_TOKEN_SECRET" --data-file=-
fi

SECRETS_ARG="FEISHU_BOT_WEBHOOK_URL=${PSA_FEISHU_WEBHOOK_SECRET}:latest,GEMINI_API_KEY=${PSA_GEMINI_SECRET}:latest,CRON_SHARED_TOKEN=${PSA_CRON_TOKEN_SECRET}:latest,FEISHU_INBOUND_VERIFY_TOKEN=${PSA_VERIFY_TOKEN_SECRET}:latest,FEISHU_WEBHOOK_PATH_SECRET=${PSA_WEBHOOK_PATH_SECRET}:latest"
if [[ -n "$PSA_VERIFY_TOKEN_SECRET" ]]; then
  if gcloud secrets describe "$PSA_VERIFY_TOKEN_SECRET" >/dev/null 2>&1; then
    :
  else
    echo "⚠️ 指定了 PSA_VERIFY_TOKEN_SECRET=$PSA_VERIFY_TOKEN_SECRET，但未找到，已跳过。"
  fi
fi
if gcloud secrets describe "$PSA_FEISHU_APP_ID_SECRET" >/dev/null 2>&1 && gcloud secrets describe "$PSA_FEISHU_APP_SECRET_SECRET" >/dev/null 2>&1; then
  SECRETS_ARG="${SECRETS_ARG},FEISHU_APP_ID=${PSA_FEISHU_APP_ID_SECRET}:latest,FEISHU_APP_SECRET=${PSA_FEISHU_APP_SECRET_SECRET}:latest"
else
  echo "⚠️ 未找到 FEISHU_APP_ID/FEISHU_APP_SECRET secrets，当前将降级为 webhook 回执（非同会话）。"
fi

echo "==> 部署 Cloud Run 服务: $SERVICE_NAME"
gcloud run deploy "$SERVICE_NAME" \
  --source ./cloud/relay \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "TZ=Asia/Shanghai,PSA_APP_NAME=Personal Secretary Cloud Relay,FEISHU_KEYWORD=${FEISHU_KEYWORD},FEISHU_ENFORCE_VERIFY_TOKEN=true,FEISHU_IM_REPLY_ENABLED=true,GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
  --set-secrets "$SECRETS_ARG"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
echo "✅ Cloud Run URL: $SERVICE_URL"

CRON_TOKEN_VALUE="$(gcloud secrets versions access latest --secret="$PSA_CRON_TOKEN_SECRET")"

create_or_update_scheduler_job() {
  local job_name="$1"
  local schedule="$2"
  local uri="$3"

  if gcloud scheduler jobs describe "$job_name" --location "$SCHEDULER_REGION" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "$job_name" \
      --location "$SCHEDULER_REGION" \
      --schedule "$schedule" \
      --time-zone "$SCHEDULER_TZ" \
      --uri "$uri" \
      --http-method POST \
      --update-headers "x-cron-token=${CRON_TOKEN_VALUE},content-type=application/json" \
      --message-body "{}" >/dev/null
    echo "🔁 已更新 Scheduler job: $job_name"
  else
    gcloud scheduler jobs create http "$job_name" \
      --location "$SCHEDULER_REGION" \
      --schedule "$schedule" \
      --time-zone "$SCHEDULER_TZ" \
      --uri "$uri" \
      --http-method POST \
      --headers "x-cron-token=${CRON_TOKEN_VALUE},content-type=application/json" \
      --message-body "{}" >/dev/null
    echo "🆕 已创建 Scheduler job: $job_name"
  fi
}

echo "==> 配置 Scheduler 定时任务"
create_or_update_scheduler_job "psa-watch-scan-8h" "0 */8 * * *" "${SERVICE_URL}/cron/watch-scan?source=scheduler_8h"
create_or_update_scheduler_job "psa-brief-morning" "0 8 * * *" "${SERVICE_URL}/cron/briefing?type=morning"
create_or_update_scheduler_job "psa-brief-evening" "30 22 * * *" "${SERVICE_URL}/cron/briefing?type=evening"

echo ""
echo "🎉 部署完成"
echo "1) 飞书事件回调地址模板：${SERVICE_URL}/webhooks/feishu/<path_secret>"
echo "2) 飞书 Verify Token：已托管到 Secret（未明文输出）"
echo "3) 健康检查地址：${SERVICE_URL}/health"
echo "4) 本地拉取待同步任务：${SERVICE_URL}/api/tasks/pending?limit=20"
echo "5) CRON token 已由 Secret Manager 托管：${PSA_CRON_TOKEN_SECRET}"
echo "6) 查看安全值（本地执行，不要截图外发）："
echo "   gcloud secrets versions access latest --secret=${PSA_WEBHOOK_PATH_SECRET}"
echo "   gcloud secrets versions access latest --secret=${PSA_VERIFY_TOKEN_SECRET}"
