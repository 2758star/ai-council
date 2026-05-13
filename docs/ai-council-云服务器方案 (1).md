# 阿里云服务器方案 — 开发环境 + 未来扩展

> 给 Codex 的实现方案
> 服务器配置：阿里云轻量应用服务器 2核2G，40GB ESSD，200M 带宽
> 核心用途：远程开发环境，随时随地用 Claude Code 写代码
> API：DeepSeek（已有 key）

---

## 一、现在要做的事：远程开发环境

### 1.1 目标

在阿里云上搭一个完整的开发环境，实现：
- 任何设备（手机、iPad、电脑）打开浏览器就能写代码
- Claude Code 在云上运行，不依赖本地 Mac
- 代码通过 GitHub 同步，回到 Mac 上 git pull 就能运行 Tauri

### 1.2 需要安装的东西

```
阿里云服务器
├── 系统：Ubuntu 24.04（推荐）
├── code-server（网页版 VS Code）
│   └── 浏览器打开就是完整的 VS Code
├── Claude Code（命令行 AI 编程工具）
│   └── 连接 DeepSeek API
├── Node.js 20+（前端开发）
├── Git（代码同步）
├── npm / pnpm（包管理）
└── 可选：Docker（未来扩展用）
```

### 1.3 搭建步骤

#### 第一步：基础环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y git curl wget build-essential

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 确认版本
node -v  # 应该是 v20.x
npm -v
```

#### 第二步：安装 code-server

```bash
# 一键安装
curl -fsSL https://code-server.dev/install.sh | sh

# 配置
mkdir -p ~/.config/code-server
cat > ~/.config/code-server/config.yaml << EOF
bind-addr: 0.0.0.0:8080
auth: password
password: 你设一个强密码
cert: false
EOF

# 启动（后台运行）
sudo systemctl enable --now code-server@$USER

# 开机自启
sudo systemctl enable code-server@$USER
```

访问方式：浏览器打开 `http://你的服务器IP:8080`，输入密码即可。

**安全建议：** 
- 在阿里云控制台的防火墙/安全组中开放 8080 端口
- 强烈建议配 HTTPS，可以用 Caddy 反向代理 + 自动证书：

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 配置 Caddy（如果你有域名）
# /etc/caddy/Caddyfile
# code.yourdomain.com {
#     reverse_proxy localhost:8080
# }
```

如果没有域名，直接用 IP + 端口访问也可以，但建议至少设一个强密码。

#### 第三步：安装 Claude Code

```bash
# 安装 Claude Code
npm install -g @anthropic-ai/claude-code

# 配置 DeepSeek API
# Claude Code 支持自定义 API endpoint
# 具体配置方式参考 Claude Code 文档，设置：
#   - API base URL: https://api.deepseek.com/v1
#   - API key: 你的 DeepSeek key
#   - Model: deepseek-chat 或 deepseek-coder
```

#### 第四步：配置 Git + GitHub

```bash
# 配置 Git
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 生成 SSH key
ssh-keygen -t ed25519 -C "你的邮箱"
cat ~/.ssh/id_ed25519.pub
# 把输出的公钥添加到 GitHub → Settings → SSH Keys

# 克隆你的 AI Council 项目
git clone git@github.com:你的用户名/ai-council.git
cd ai-council
npm install
```

### 1.4 日常工作流

```
┌──────────────────────────────────────────────┐
│                日常开发流程                     │
│                                              │
│  任何设备打开浏览器                              │
│       ↓                                      │
│  访问 code-server（网页版 VS Code）             │
│       ↓                                      │
│  打开终端，用 Claude Code 写代码                 │
│       ↓                                      │
│  git add + commit + push 到 GitHub            │
│       ↓                                      │
│  回到 Mac 上                                  │
│       ↓                                      │
│  git pull                                    │
│       ↓                                      │
│  npm run tauri dev（本地运行测试）               │
└──────────────────────────────────────────────┘
```

### 1.5 资源占用估算

2核2G 的服务器跑这些完全够用：

| 服务 | 内存占用 |
|------|---------|
| code-server | ~300-500MB |
| Claude Code（运行时） | ~100-200MB |
| Node.js 开发进程 | ~100-300MB |
| 系统 + 其他 | ~300MB |
| **合计** | **~800MB - 1.3GB** |

2GB 内存够用，但建议加一个 1GB 的 swap 防止偶尔的内存峰值：

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.6 你已有的网站

你说服务器上已经在跑一个网页。在装新东西之前：

```bash
# 先看一下现在在跑什么
sudo systemctl list-units --type=service --state=running
docker ps  # 如果装了 Docker 的话
sudo lsof -i -P -n | grep LISTEN  # 看哪些端口在用
```

确认现有服务用了哪些端口，避免冲突。code-server 默认用 8080，如果被占了就换一个。

---

## 二、未来可以加的东西

以下内容不用现在做，等你本地版用顺了、有明确需求了再加。

### 2.1 后台任务服务

如果将来你发现有些任务想在后台自动跑（比如用 DeepSeek API 定时帮你整理资料、总结文档），可以在云上加一个简单的任务队列：

```
你在手机上提交任务
  ↓
云上的任务服务接收
  ↓
用 DeepSeek API 处理
  ↓
结果存到数据库
  ↓
你下次打开就能看到结果
```

技术方案：一个简单的 Node.js + SQLite + Bull（任务队列），加一个极简的网页界面看任务状态。

### 2.2 AI Council 云端轻量版

如果将来你买了 Claude / GPT 的 API key，可以在云上部署一个纯 API 版的 AI Council：

- 不走网页自动化，全走 API
- DeepSeek 当管家（和本地版一样）
- Claude API + GPT API + Gemini API 当讨论成员
- 网页界面，手机也能用

这样就实现了你说的"不用开电脑也能让 AI 们讨论"。

### 2.3 知识库 / 资料库

云上可以存你的常用资料——论文、剧本素材、营销案例等。配合 DeepSeek API 做简单的 RAG（检索增强生成），问它问题的时候自动从你的资料库里找相关内容。

### 2.4 远程开发增强

- **GitHub Actions**：代码 push 后自动跑测试
- **Tailscale**：在云服务器和 Mac 之间建 VPN，更安全地远程访问
- **Portainer**：如果用 Docker，装这个可以通过网页管理容器

---

## 三、安全清单

云服务器暴露在公网上，基本安全要做好：

### 必做

- [ ] 修改 SSH 默认端口（不要用 22）
- [ ] 禁用密码登录，只用 SSH key
- [ ] code-server 设强密码（16 位以上，字母数字符号混合）
- [ ] 阿里云安全组只开必要端口（SSH、8080、你的网站端口）
- [ ] 定期 `apt update && apt upgrade`

### 建议做

- [ ] 配域名 + HTTPS（Caddy 自动证书）
- [ ] 安装 fail2ban（防暴力破解）
- [ ] code-server 前面加一层 HTTP Basic Auth 或 OAuth

### 配置示例：SSH 加固

```bash
# 修改 SSH 配置
sudo vim /etc/ssh/sshd_config

# 改这几行：
Port 你选的端口号        # 不要用 22
PasswordAuthentication no  # 禁用密码登录
PermitRootLogin no         # 禁用 root 登录

# 重启 SSH
sudo systemctl restart sshd

# 记得在阿里云安全组里把新端口打开，否则会把自己锁在外面！
```

---

## 四、实施步骤

按这个顺序来：

### 第一天：基础搭建
1. SSH 到服务器，确认现有服务状况
2. 安装 Node.js、Git
3. 安装 code-server，配好密码
4. 浏览器测试访问

### 第二天：开发环境
5. 安装 Claude Code，配置 DeepSeek API
6. 配置 Git + GitHub SSH key
7. 克隆 AI Council 项目
8. 在 code-server 里试着用 Claude Code 改一个小东西，push，Mac 上 pull 验证

### 第三天：安全加固
9. SSH 加固
10. 加 swap
11. 可选：配域名 + HTTPS

### 之后：正常使用
- 日常用 code-server + Claude Code 开发
- 本地 Mac 负责运行 Tauri 测试
- 有新的云端需求了再回来看第二节
