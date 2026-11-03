#!/usr/bin/env bash
# Postaví vývojový stroj od nuly. Pustí se na čerstvém Debianu nebo Ubuntu
# jako běžný uživatel se sudo.
#
# Smysl: ten stroj se smí zahodit. Všechno, co tu je, se dá postavit znovu
# tímhle skriptem, takže nový poskytovatel je půlhodina práce, ne večer.
# Nic autoritativního na něm nežije — kód je v gitu, nasazení dělá CI.
#
# Co dělá a proč zrovna tohle:
#
#   docker        integrační testy jedou přes Testcontainers, bez Dockeru
#                 je `dotnet test` bez filtru nespustitelný
#   .NET SDK      API a testy
#   node          web a appka
#   tailscale     aby na stroj šlo z telefonu i bez veřejné IP, a hlavně
#                 aby telefon uvidel dev server pro Expo Go
#   claude code   vlastní účet na tomhle stroji, oddělený od pracovního
#   code-server   VS Code v prohlížeči, když je po ruce jen tablet
#
# Záměrně tu NENÍ nic, co by drželo stav: žádná databáze pro produkci,
# žádné tajemství, žádný cron. Tohle je pracovní stůl, ne server.
set -euo pipefail

VERZE_DOTNET="10.0"
UZIVATEL="${SUDO_USER:-$USER}"

krok() { printf '\n=== %s ===\n' "$1"; }
mam()  { command -v "$1" >/dev/null 2>&1; }

if [ "$(id -u)" -eq 0 ]; then
  echo "Nepouštěj to jako root — skript si o sudo řekne sám tam, kde ho potřebuje." >&2
  exit 1
fi

krok "systém"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git ca-certificates gnupg unzip ripgrep jq

krok "docker"
if mam docker; then
  echo "už je"
else
  # Oficiální repozitář, ne balíček z distribuce — ten bývá o dvě verze
  # zpátky a Testcontainers na starém API umí spadnout až v polovině testu.
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$UZIVATEL"
  echo "POZOR: do grupy docker se dostaneš až po novém přihlášení."
fi

krok ".NET SDK $VERZE_DOTNET"
if mam dotnet; then
  dotnet --version
else
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
  bash /tmp/dotnet-install.sh --channel "$VERZE_DOTNET" --install-dir "$HOME/.dotnet"
  rm -f /tmp/dotnet-install.sh
  {
    echo 'export DOTNET_ROOT="$HOME/.dotnet"'
    echo 'export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"'
  } >> "$HOME/.profile"
  export DOTNET_ROOT="$HOME/.dotnet"
  export PATH="$HOME/.dotnet:$PATH"
fi

krok "node"
if mam node; then
  node -v
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

krok "tailscale"
if mam tailscale; then
  tailscale status --json >/dev/null 2>&1 && echo "už běží" || echo "nainstalovaný, nepřihlášený"
else
  curl -fsSL https://tailscale.com/install.sh | sh
  echo "Přihlas ho: sudo tailscale up"
fi

krok "claude code"
if mam claude; then
  claude --version
else
  curl -fsSL https://claude.ai/install.sh | bash
  echo "Přihlášení: spusť 'claude', klávesou 'c' zkopíruj URL, otevři ji"
  echo "na Macu a kód vlož zpátky do terminálu."
fi

krok "code-server"
if mam code-server; then
  code-server --version | head -1
else
  curl -fsSL https://code-server.dev/install.sh | sh
  echo "Pusť ho až po Tailscale a jen na jeho adresu, ne na 0.0.0.0:"
  echo "  code-server --bind-addr \$(tailscale ip -4):8080"
fi

krok "repozitáře"
mkdir -p "$HOME/Developer/GitHub"
for r in orlickypohar platform; do
  if [ -d "$HOME/Developer/GitHub/$r/.git" ]; then
    echo "$r: už je"
  else
    echo "$r: naklonuj sám, až bude git mít přístup:"
    echo "  git clone git@github.com:file-pb/$r.git $HOME/Developer/GitHub/$r"
  fi
done

krok "co zbývá udělat ručně"
cat <<'ZBYVA'
1. sudo tailscale up            (a v appce Tailscale na iPhonu totéž)
2. gh auth login                (nebo nahrát SSH klíč) a naklonovat repozitáře
3. claude                       a přihlásit se svým účtem
4. export EXPO_TOKEN=...        z https://expo.dev/settings/access-tokens
                                — na Linuxu klíčenka není, skripty to umí
5. odhlásit a přihlásit se       kvůli grupě docker
6. dotnet test                  bez filtru; integrační testy tu konečně jedou
ZBYVA
