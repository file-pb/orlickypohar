#!/usr/bin/env bash
# Postaví APK k rozdávání na serverech Expa.
#
# Token se bere z klíčenky, stejně jako u `npm run telefon` — v repozitáři
# ani v `.env` nemá co dělat:
#
#     security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
#
# Na bezplatném tarifu se čeká ve frontě; samotný build trvá pár minut,
# čekání na volný stroj klidně půl hodiny. `--no-wait` proto pustí build
# a vrátí odkaz, na kterém se stav sleduje.
set -euo pipefail

if ! token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null); then
  echo "V klíčence není 'expo-token'. Vyrob ho na https://expo.dev/settings/access-tokens" >&2
  exit 1
fi

EXPO_TOKEN="$token" exec npx -y eas-cli@latest build \
  --platform android --profile preview --non-interactive --no-wait "$@"
