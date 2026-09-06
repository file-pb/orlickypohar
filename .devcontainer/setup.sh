#!/usr/bin/env bash
# Rozjezd prostředí. Běží jednou po vytvoření Codespace nebo devcontaineru.
set -euo pipefail

echo "==> obnovení závislostí"
dotnet restore

# SSH klíč z Codespaces secretu. Bez něj se dá vyvíjet a pushovat přes HTTPS,
# jen se nedostaneš na server.
if [ -n "${SSH_PRIVATE_KEY:-}" ]; then
    echo "==> nastavuji SSH klíč"
    install -d -m 700 ~/.ssh
    printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    ssh-keygen -y -f ~/.ssh/id_ed25519 > ~/.ssh/id_ed25519.pub 2>/dev/null || true
    ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true
    echo "    hotovo"
else
    echo "==> SSH_PRIVATE_KEY není nastavený"
    echo "    Nastav ho na github.com/settings/codespaces, jinak se odsud"
    echo "    nedostaneš na server."
fi

echo "==> prostředí připraveno"
