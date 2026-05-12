# AI Council Cloud Dev Environment

## Goal

先把 `AI Council` 的开发环境搬到云端，这样后面你不用开着本地 Mac，也能用手机、iPad 或任何浏览器继续让 Claude Code 写代码。

这条线的定位是：

- 云端负责开发和提交代码
- 本地 Mac 负责拉代码、运行 Tauri、看真实桌面效果

## Recommended workflow

```text
手机 / iPad / 电脑浏览器
  -> code-server
  -> Claude Code
  -> 修改 AI Council 仓库
  -> git commit / push
  -> 回到本地 Mac
  -> git pull
  -> npm run tauri:build 或 npm run dev
```

所以答案是：`对，你可以在云端 GitHub 工作流里写，然后再同步到本地。`

更准确地说，是：

1. 云服务器上克隆同一个 GitHub 仓库
2. 在云端用 `code-server + Claude Code` 写代码
3. push 到 GitHub
4. 回到本地 Mac 上 `git pull`
5. 本地继续跑 Tauri 和网页自动化相关实测

## What is already prepared in this repo

已经放好的文件：

- setup script:
  - [setup-ubuntu.sh](/Users/hujunbo/Documents/Playground/scripts/cloud-dev/setup-ubuntu.sh:1)
- code-server config template:
  - [code-server-config.yaml.example](/Users/hujunbo/Documents/Playground/scripts/cloud-dev/code-server-config.yaml.example:1)

## Server assumptions

推荐环境：

- Ubuntu 24.04
- 2C2G 以上
- 40GB 磁盘
- 已有 sudo 权限

## One-command bootstrap

把仓库同步到服务器后，执行：

```bash
cd /path/to/Playground
CODE_SERVER_PASSWORD='your-strong-password' bash scripts/cloud-dev/setup-ubuntu.sh
```

可选环境变量：

```bash
INSTALL_CADDY=1
ENABLE_SWAP=1
SWAP_SIZE_GB=1
NODE_MAJOR=20
WORKSPACE_DIR=$HOME/workspace
```

示例：

```bash
cd /path/to/Playground
CODE_SERVER_PASSWORD='your-strong-password' \
INSTALL_CADDY=1 \
ENABLE_SWAP=1 \
SWAP_SIZE_GB=1 \
bash scripts/cloud-dev/setup-ubuntu.sh
```

## What the script installs

- Node.js 20
- Git / curl / build-essential
- code-server
- Claude Code
- optional swap
- optional Caddy

## After bootstrap

### 1. open security group

开放云服务器的 TCP `8080`。

### 2. open code-server

浏览器访问：

```text
http://<server-ip>:8080
```

### 3. clone repo on the server

```bash
mkdir -p ~/workspace
cd ~/workspace
git clone <your-github-repo>
cd Playground
npm install
```

### 4. start working with Claude Code

在 code-server 的终端里直接跑 Claude Code，然后继续开发 `AI Council`。

## Git strategy

推荐用这套最稳：

- 云端写代码
- push 到 GitHub
- 本地 pull
- 本地做 Tauri / macOS / Chrome 自动化验证

原因很简单：

- 云端不适合直接验证 Tauri 桌面表现
- 但云端很适合写 React / TypeScript / Rust 逻辑和文档
- 本地最适合做网页登录自动化和最终体验验收

## Important note

这套环境我已经帮你在仓库里准备好了，但`我现在不能直接替你登录云服务器执行安装`，除非你后面提供 SSH 访问方式或你自己先跑脚本。

所以最顺的下一步是：

1. 你把这个仓库放到 GitHub
2. 在云服务器上 clone
3. 跑 `setup-ubuntu.sh`
4. 你告诉我云端入口和现状
5. 我再继续按“云端开发、本地验收”的方式陪你推进
