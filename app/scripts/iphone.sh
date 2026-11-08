#!/usr/bin/env bash
# Postaví appku pro **skutečný iPhone** (Release) a nainstaluje ji.
#
# Proč skript a ne pár příkazů v hlavě: každý z kroků níž je past, na
# kterou se už jednou šláplo, a `ios/` je gitignorovaný — po každém
# `prebuild --clean` se všechny vracejí.
#
#   ./scripts/iphone.sh            # postaví a nainstaluje
#   ZNOVU=1 ./scripts/iphone.sh    # napřed `prebuild --clean`
set -euo pipefail
cd "$(dirname "$0")/.."

TYM=${TYM:-5R4YYH8GY6}
KANAL=${KANAL:-preview}
BUNDLE=cz.klihovka.orlickypohar
PLIST=ios/Orlickpohr/Supporting/Expo.plist
NAROK=ios/Orlickpohr/Orlickpohr.entitlements

# <b>CocoaPods čte soubory podle locale.</b> V neinteraktivním shellu
# žádná není a `pod install` spadne na „Unicode Normalization not
# appropriate for ASCII-8BIT".
export LANG=${LANG:-en_US.UTF-8} LC_ALL=${LC_ALL:-en_US.UTF-8}

if [ "${ZNOVU:-}" = 1 ] || [ ! -d ios ]; then
  npx expo prebuild --platform ios --clean
fi

# <b>Osobní tým nemá push.</b> `prebuild` vyrobí nárok `aps-environment`,
# který profil osobního týmu neobsahuje — podpis pak selže na
# „Provisioning profile doesn't include the Push Notifications
# capability". Appka o vzdálená upozornění přijde; místní jí zůstanou.
if [ -f "$NAROK" ]; then
  /usr/libexec/PlistBuddy -c "Delete :aps-environment" "$NAROK" 2>/dev/null || true
fi

# <b>Bez kanálu appka aktualizace nedostane</b> (8. 11. 2026). EAS ho
# bere z `eas.json` a zapisuje do Expo.plist sám; lokální `xcodebuild`
# ne, takže se telefon ptal `u.expo.dev` bez `expo-channel-name`
# a dostával HTTP 400. Navenek to vypadalo, že nic nového není — appka
# na to nijak neupozorní.
#
# Zapisuje se **až sem, ne do `app.json`**: tamta cesta by posunula
# nativní otisk, a tím by se od publikovaných aktualizací odřízlo
# i vydané APK, které kanál dostalo od EAS správně.
/usr/libexec/PlistBuddy -c "Delete :EXUpdatesRequestHeaders" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :EXUpdatesRequestHeaders dict" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :EXUpdatesRequestHeaders:expo-channel-name string $KANAL" "$PLIST"

xcodebuild \
  -workspace ios/Orlickpohr.xcworkspace \
  -scheme Orlickpohr \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/build-release \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TYM" \
  build

APP=ios/build-release/Build/Products/Release-iphoneos/Orlickpohr.app
echo "Postaveno: $APP"
echo "Otisk: $(cat "$APP/EXUpdates.bundle/fingerprint")"
echo "Kanál: $(/usr/libexec/PlistBuddy -c 'Print :EXUpdatesRequestHeaders:expo-channel-name' "$APP/Expo.plist")"

# <b>UDID se vytahuje vzorem, ne pořadím sloupce.</b> Jméno zařízení má
# mezery („Filip - iPhone"), takže počítání polí od konce sebralo kus
# jména a `devicectl` pak hlásil „The specified device was not found".
TELEFON=${TELEFON:-$(xcrun devicectl list devices 2>/dev/null \
  | grep physical \
  | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}|[0-9A-F-]{36}' \
  | head -1)}
if [ -z "$TELEFON" ]; then
  echo "Žádný telefon není spárovaný — appka je postavená, instalaci pusť ručně."
  exit 0
fi

xcrun devicectl device install app --device "$TELEFON" "$APP"
echo "Nainstalováno na $TELEFON ($BUNDLE)."
