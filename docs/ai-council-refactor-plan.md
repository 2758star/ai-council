# AI Council Refactor Plan

## Direction

AI Council 采用 `本地版优先，云端版后置，管家层可插拔` 的路线。

- 本地版是主产品
  - React + Vite + Tauri
  - macOS + Chrome 网页线程自动化
  - Room / Session / Transcript / Artifacts 为核心数据结构
- 云端版先不抢主线
  - 作为远程开发环境和未来 API 版扩展
  - 不影响本地版产品节奏
- 管家层保持可插拔
  - 当前先把本地群聊产品做扎实
  - 后续再接 DeepSeek 做编排、压缩、额度与质量管理

## Product Architecture

### Room

长期容器，负责：

- 网页线程绑定
- Session 列表
- 当前活跃 Session

### Session

一次独立讨论，负责：

- topic
- context
- transcript
- summary
- memory
- artifacts

### Artifacts

每个 Session 的产物层，当前保留四类：

- decision
- action_items
- draft
- comparison

## Delivery Order

### Phase 1: discussion shell

已完成：

- 新 standalone 前端
- 固定线程绑定
- `@mention`
- 只同步有变化
- 回复完成判定
- 健康度状态机
- Room / Session

### Phase 2: productization

进行中：

- Artifacts 基础层

下一步：

- 撤回用户消息
- 驳回模型回复并重做
- 一轮一停的甲方控制模式
- Stage 系统：出题 / 互评 / 定向修改 / 终稿

### Phase 3: steward layer

后续接入 DeepSeek 管家：

- 转述编排
- 上下文压缩
- 防吵架检测
- 额度估算与建议
- 轮次质量概览

### Phase 4: cloud and remote

后置扩展：

- 阿里云远程开发环境
- 轻量 API 版 AI Council
- 云端知识库 / 后台任务

## Current Rule

任何新功能优先满足以下原则：

1. 不复用旧 Personal Secretary 旧壳
2. 优先服务本地版群聊体验
3. Room 和 Session 分层不能再混
4. 新能力尽量沉淀到 Session 产物层
5. 云端相关能力不阻塞本地主线
