#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  echo "Please run this script as a regular user with sudo access, not as root."
  exit 1
fi

CODE_SERVER_PASSWORD="${CODE_SERVER_PASSWORD:-}"
INSTALL_CADDY="${INSTALL_CADDY:-0}"
ENABLE_SWAP="${ENABLE_SWAP:-1}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-1}"
NODE_MAJOR="${NODE_MAJOR:-20}"
WORKSPACE_DIR="${WORKSPACE_DIR:-$HOME/workspace}"

if [[ -z "${CODE_SERVER_PASSWORD}" ]]; then
  echo "CODE_SERVER_PASSWORD is required."
  echo "Example:"
  echo "  CODE_SERVER_PASSWORD='strong-password' bash scripts/cloud-dev/setup-ubuntu.sh"
  exit 1
fi

echo "==> Updating system packages"
sudo apt update
sudo apt upgrade -y

echo "==> Installing base packages"
sudo apt install -y \
  git \
  curl \
  wget \
  build-essential \
  ca-certificates \
  gnupg \
  lsb-release \
  unzip \
  jq

echo "==> Installing Node.js ${NODE_MAJOR}"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt install -y nodejs

echo "==> Installing code-server"
curl -fsSL https://code-server.dev/install.sh | sh

echo "==> Writing code-server config"
mkdir -p "$HOME/.config/code-server"
cat > "$HOME/.config/code-server/config.yaml" <<EOF
bind-addr: 0.0.0.0:8080
auth: password
password: ${CODE_SERVER_PASSWORD}
cert: false
EOF

echo "==> Enabling code-server service"
sudo systemctl enable --now "code-server@${USER}"

if [[ "${INSTALL_CADDY}" == "1" ]]; then
  echo "==> Installing Caddy"
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt update
  sudo apt install -y caddy
  echo "Caddy installed. Configure /etc/caddy/Caddyfile manually if you have a domain."
fi

if [[ "${ENABLE_SWAP}" == "1" ]] && ! sudo swapon --show | grep -q '/swapfile'; then
  echo "==> Creating ${SWAP_SIZE_GB}G swapfile"
  sudo fallocate -l "${SWAP_SIZE_GB}G" /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
fi

echo "==> Preparing workspace directory"
mkdir -p "${WORKSPACE_DIR}"

echo "==> Installing Claude Code"
sudo npm install -g @anthropic-ai/claude-code

echo "==> Environment summary"
echo "Node: $(node -v)"
echo "npm: $(npm -v)"
echo "code-server: $(code-server --version | head -n 1)"
echo "Workspace: ${WORKSPACE_DIR}"
echo
echo "Next steps:"
echo "1. Open your server security group for TCP 8080."
echo "2. Visit http://<server-ip>:8080 and log into code-server."
echo "3. In code-server terminal:"
echo "   cd ${WORKSPACE_DIR}"
echo "   git clone <your-github-repo>"
echo "   cd <repo-name>"
echo "   npm install"
echo "4. Configure Claude Code inside the server session."
