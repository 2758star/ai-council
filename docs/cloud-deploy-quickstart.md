# Personal Secretary Cloud 部署快启（个人版）

适用场景：
- 电脑会关机，仍希望飞书消息和官网扫描持续运行。
- 先追求稳定可用，不做复杂微服务拆分。

当前仓库已包含：
- Cloud Run 服务代码：`cloud/relay/server.mjs`
- 一键部署脚本：`scripts/deploy-google-relay.sh`

---

## 1. 先决条件

1. 已安装并登录 `gcloud`
2. 已有 Google Cloud 项目（可复用你旧项目）
3. 已创建两个 Gemini key（你已完成）
4. 已准备一个飞书机器人 webhook（用于回执/推送）

---

## 2. 创建必须的 Secret（只做一次）

将下面命令里的值替换成你自己的：

```bash
printf 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxx' | gcloud secrets create psa-feishu-webhook --data-file=-
printf 'YOUR_GEMINI_KEY_FOR_PSA' | gcloud secrets create gemini-key-psa --data-file=-
```

如果 Secret 已存在，改用：

```bash
printf 'NEW_VALUE' | gcloud secrets versions add psa-feishu-webhook --data-file=-
printf 'NEW_VALUE' | gcloud secrets versions add gemini-key-psa --data-file=-
```

---

## 3. 一键部署（推荐）

在项目根目录执行：

```bash
PROJECT_ID='你的GCP项目ID' \
REGION='asia-east1' \
SCHEDULER_REGION='asia-east1' \
SCHEDULER_TZ='Asia/Shanghai' \
FEISHU_KEYWORD='Mos提醒' \
bash scripts/deploy-google-relay.sh
```

脚本会自动做：
1. 启用必需 API
2. 检查/创建 Firestore 默认数据库
3. 检查 Secret
4. 部署 Cloud Run 服务 `psa-relay`
5. 创建或更新 3 个 Scheduler 任务：
   - 每 8 小时官网扫描
   - 08:00 晨间简报
   - 22:30 晚间回顾

---

## 4. 部署后立刻验证

1. 健康检查：

```bash
curl 'https://你的CloudRunURL/health'
```

2. 飞书 webhook 验证（本地模拟）：

```bash
curl -X POST 'https://你的CloudRunURL/webhooks/feishu' \
  -H 'Content-Type: application/json' \
  -d '{"event":{"text":"明早八点 GRE 阅读"}}'
```

3. 查看待同步任务：

```bash
curl 'https://你的CloudRunURL/api/tasks/pending?limit=20'
```

---

## 5. 飞书后台需要配置

将飞书事件订阅回调地址设置为（安全路径）：

`https://你的CloudRunURL/webhooks/feishu/<path_secret>`

`path_secret` 与 `verify token` 都从 Secret Manager 读取，不要写死到代码里：

```bash
gcloud secrets versions access latest --secret=psa-feishu-webhook-path-secret
gcloud secrets versions access latest --secret=psa-feishu-verify-token
```

---

## 6. 成本建议（个人长期）

1. 先用 `Cloud Run + Scheduler + Firestore + Secret Manager`
2. Gemini 模型先用 `2.5 Flash`
3. 先不上 Cloud SQL（它通常是主要成本项）

---

## 7. 失败时最先看哪里

1. Cloud Run 日志：看 `/webhooks/feishu` 是否有请求
2. Scheduler 执行日志：看 cron 是否调用成功
3. Secret 值是否有效（webhook / gemini key）

### 飞书发消息但没回执（最常见）

按这个顺序排查，2 分钟就能定位：

1. 先确认请求有没有打到你的服务  
   `gcloud run services logs read psa-relay --region asia-east1 --limit 20`

2. 如果日志里完全没有 `POST .../webhooks/feishu/...`  
   说明飞书“事件订阅”没有真正触发（不是代码问题）：
   - 在飞书开放平台的“事件配置”里订阅 `im.message.receive_v1`
   - 发布应用新版本
   - 把应用机器人拉进你发消息的会话
   - 建议先 `@机器人` 再发一条命令测试

3. 如果有 `POST` 但是 `403`
   - `verify token` 不一致
   - 重新把飞书后台 token 和 Secret `psa-feishu-verify-token` 对齐

4. 如果有 `POST 200` 但仍没看到聊天内回执
   - 检查应用是否开通“消息发送”相关权限（用于 `im/v1/messages/.../reply`）
   - 服务端会自动降级用 webhook 回执，所以至少应在机器人 webhook 会话里看到提示

---

## 8. 下一步（完成部署后）

下一阶段建议把桌面 App 接上云端同步：
- 启动时拉取 `/api/tasks/pending`
- 成功写入本地后调用 `/api/tasks/:id/ack`
- 本地与云端形成闭环，不重复导入

---

## 9. 严格保密建议（强烈建议）

1. 所有敏感值只放 Secret Manager，不写在代码、文档、终端历史里：
   - `psa-feishu-webhook`
   - `gemini-key-psa`
   - `psa-cron-shared-token`
2. Cloud Run 使用 `--set-secrets` 注入，不用明文 `--set-env-vars` 传密钥。
3. 若怀疑泄露，立即轮换：
   - 新增 Secret version
   - 重新部署 Cloud Run
4. 不在聊天截图、日志截图里展示完整 webhook 或 key。
