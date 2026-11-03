#!/usr/bin/env bash
# Spustí vývojový server tak, jak ho chce telefon.
#
# Dvě věci, které se pokaždé zvrtnou a stály večer:
#
# 1. **Expo Go na iOSu vyžaduje od SDK 57 přihlášení na obou stranách** —
#    v terminálu i v appce, a ke stejnému účtu. Anonymně to nejde ani přes
#    ručně zadanou adresu. Token bereme z `EXPO_TOKEN`, a když není, z macOS
#    klíčenky — tam nikde neleží v čitelném souboru:
#
#        security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
#
#    (token se vyrábí na https://expo.dev/settings/access-tokens)
#
# 2. **Mac má víc síťových rozhraní** a Expo si umí vybrat to, na kterém
#    telefon není — pak QR vede na adresu, kam se nedovolá. Bereme adresu
#    z Wi-Fi, ne co vybere samo.
set -euo pipefail

# Adresa, na kterou se telefon dovolá. Na Macu je to Wi-Fi, na vývojovém
# stroji v datacentru Wi-Fi není a telefon s ním nesdílí síť — tam vede
# cesta přes Tailscale, takže se bere jeho adresa. Předem nastavená
# REACT_NATIVE_PACKAGER_HOSTNAME má přednost před oběma.
ip="${REACT_NATIVE_PACKAGER_HOSTNAME:-}"
if [[ -z "$ip" ]] && command -v ipconfig >/dev/null 2>&1; then
  ip=$(ipconfig getifaddr en0 2>/dev/null || true)
fi
if [[ -z "$ip" ]] && command -v tailscale >/dev/null 2>&1; then
  ip=$(tailscale ip -4 2>/dev/null | head -1 || true)
fi
if [[ -z "$ip" ]]; then
  echo "Nevím, na jakou adresu má telefon chodit." >&2
  echo "Na Macu to čekám z Wi-Fi (en0), na serveru z Tailscale." >&2
  echo "Jinak ji dej do REACT_NATIVE_PACKAGER_HOSTNAME." >&2
  exit 1
fi

token="${EXPO_TOKEN:-}"
if [[ -z "$token" ]] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null || true)
fi
if [[ -z "$token" ]]; then
  echo "Chybí token. Buď ho dej do EXPO_TOKEN, nebo na Macu do klíčenky:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  exit 1
fi

echo "Telefon otevře: exp://$ip:8081"
EXPO_TOKEN="$token" REACT_NATIVE_PACKAGER_HOSTNAME="$ip" exec npx expo start "$@"
