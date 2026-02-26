# VPS Setup Guide

One-time setup on your VPS. After this, deploying updates is just `git pull && npm run build` (and `./container/build.sh` if you changed the Dockerfile).

## 1. Install dependencies

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in (or: newgrp docker)

# SQLite CLI (optional, useful for debugging)
sudo apt-get install -y sqlite3
```

## 2. Clone and install

```bash
git clone <your-fork-url> NanoClaw
cd NanoClaw
npm install
npm run build
```

## 3. Configure credentials

```bash
cp .env.example .env
nano .env   # fill in all values (see below)
```

Required values in `.env`:
- `TELEGRAM_BOT_TOKEN` — already set from setup
- `TELEGRAM_ONLY=true` — already set
- `CLAUDE_CODE_OAUTH_TOKEN` — get this by running `claude setup-token` on your Mac and copying the token
- `GITHUB_TOKEN` — create at github.com/settings/tokens (needs repo scope)
- `CALDAV_USERNAME` — your Apple ID email
- `CALDAV_PASSWORD` — app-specific password from appleid.apple.com → Security → App-Specific Passwords

Sync to container:
```bash
mkdir -p data/env && cp .env data/env/env
```

## 4. Build the agent container

```bash
./container/build.sh
```

This takes a few minutes the first time (downloads Chromium, gh CLI, etc.).

## 5. Register your Telegram chat

```bash
mkdir -p store
npx tsx setup/index.ts --step register -- \
  --jid "tg:5942341913" \
  --name "Andre" \
  --trigger "@Andy" \
  --folder "main" \
  --no-trigger-required
```

## 6. Set up mount allowlist

```bash
npx tsx setup/index.ts --step mounts -- --empty
```

## 7. Set up systemd service

```bash
npx tsx setup/index.ts --step service
```

If that fails on a non-systemd system, run manually:
```bash
node dist/index.js >> logs/nanoclaw.log 2>&1 &
```

## 8. Test it

Send a message to your Telegram bot. It should respond within a few seconds.

Check logs if needed:
```bash
tail -f logs/nanoclaw.log
```

---

## Deploying updates

```bash
git pull
npm install        # only if package.json changed
npm run build
./container/build.sh   # only if Dockerfile changed
systemctl --user restart nanoclaw   # or: sudo systemctl restart nanoclaw
```
