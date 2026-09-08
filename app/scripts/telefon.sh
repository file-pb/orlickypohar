#!/usr/bin/env bash
# Spustí vývojový server tak, jak ho chce telefon.
#
# Dvě věci, které se pokaždé zvrtnou a stály večer:
#
# 1. **Expo Go na iOSu vyžaduje od SDK 57 přihlášení na obou stranách** —
#    v terminálu i v appce, a ke stejnému účtu. Anonymně to nejde ani přes
#    ručně zadanou adresu. Token si bereme z klíčenky, takže nikde neleží
#    v čitelném souboru:
#
#        security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
#
#    (token se vyrábí na https://expo.dev/settings/access-tokens)
#
# 2. **Mac má víc síťových rozhraní** a Expo si umí vybrat to, na kterém
#    telefon není — pak QR vede na adresu, kam se nedovolá. Bereme adresu
#    z Wi-Fi, ne co vybere samo.
set -euo pipefail

ip=$(ipconfig getifaddr en0 || true)
if [[ -z "$ip" ]]; then
  echo "Wi-Fi (en0) nemá adresu — je Mac na síti?" >&2
  exit 1
fi

if ! token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null); then
  echo "V klíčence není 'expo-token'. Ulož ho z clipboardu:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  exit 1
fi

echo "Telefon otevře: exp://$ip:8081"
EXPO_TOKEN="$token" REACT_NATIVE_PACKAGER_HOSTNAME="$ip" exec npx expo start "$@"
