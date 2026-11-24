# Klíč servisního účtu pro Google Play

**Jednorázové nastavení.** Je to poslední ruční krok v cestě appky do
telefonu: dokud klíč není, CI balíček do obchodu nenahraje a úloha
`balicek-do-play` skončí hlášením

```
Google Service Account Keys cannot be set up in --non-interactive mode.
```

Ověřeno 25. 11. 2026 proti průvodci Expa (`expo.fyi/creating-google-service-account`),
`docs.expo.dev/submit/android/` a nápovědě Play 9844686. Doslovné názvy
položek jsou anglicky schválně — konzole je anglicky, i když ji máš česky,
a hledat podle přeloženého názvu nejde.

**Klíč nikdy nepatří do repozitáře.** Drží ho EAS u projektu; v gitu ani
v secrets GitHubu po něm nezůstane nic. `eas.json` sice umí
`serviceAccountKeyPath`, ale tím by soubor musel být na stroji CI, a to
nechceme.

## A. Google Cloud: vyrobit účet a klíč

1. Pokud nemáš projekt v Google Cloudu, založ ho na
   `console.cloud.google.com/projectcreate`.
2. **IAM & Admin → Service Accounts**, tlačítko **Create Service Account**.
3. Dej mu jméno, ze kterého bude za rok poznat, k čemu je — třeba
   `orlickypohar-play`. Pak **Create and close**.
4. **Zkopíruj si e-mail toho účtu** (končí `.iam.gserviceaccount.com`).
   Budeš ho potřebovat v části B.
5. U účtu zvol **Manage keys → Create new key**, typ **JSON**, **Create**.
   Stáhne se soubor; ulož ho mimo repozitář.
6. V knihovně API najdi **Google Play Android Developer API** a dej
   **Enable**. Bez toho klíč do Play nepustí.

Žádnou roli v Google Cloudu tomu účtu dávat nemusíš — dokumentace žádnou
neuvádí a přístup se uděluje až v Play Console.

## B. Play Console: pustit ten účet k aplikaci

7. **Users and permissions → Invite new users.**
8. Vlož e-mail servisního účtu z kroku 4. Na záložce **App permissions**
   vyber *Orlická série* (tedy jen tuhle aplikaci, ne celý účet).
9. Zaškrtni oprávnění a dej **Invite user**.

**Kolik oprávnění dát.** Průvodce Expa doporučuje sadu, která zahrnuje
i **Release to production, exclude devices, and use Play App Signing** —
tedy právo vydávat do produkce. Pro interní testování to potřeba není
a klíč, který uteče, by s ním mohl vydat appku všem.

Doporučuju proto začít u nejmenší sady, která na interní track stačí:

- **View app information (read-only)**
- **Release apps to testing tracks**
- **Manage testing tracks and edit tester lists**

**Dokumentace nejmenší sadu neuvádí**, takže je to úsudek, ne doložený
údaj. Kdyby nahrání spadlo na oprávnění, přidej **Edit and delete draft
apps** a pak **Manage store presence**; právo vydávat do produkce dávej
teprve tehdy, až se do produkce bude doopravdy vydávat.

## C. EAS: nahrát klíč k projektu

Dvě cesty, obě dělají totéž. Klikací je jednodušší:

**Ve webu na expo.dev:** dashboard projektu → **Credentials** → pod
**Android** klepni na **application identifier** (`cz.klihovka.orlickypohar`)
→ v **Service credentials** u **Google service account key for Expo Submit**
dej **Add a Google service account key** → **Upload new key** → vyber
stažený JSON → **Save**.

**Z příkazové řádky**, v `app/`:

```bash
npx eas-cli@27.11.0 credentials --platform android
```

Pak v nabídkách: profil **production** → **Google Service Account** →
**Manage your Google Service Account Key for Play Store Submissions** →
**Set up a Google Service Account Key for Play Store Submissions** → cesta
k JSON souboru.

## Co se stane potom

Nic dalšího dělat nemusíš. Při příštím pushi do `main`, kde se změnilo
`app/`, úloha `balicek-do-play` porovná nativní otisk se stavem obchodu,
balíček postaví a nahraje ho na track **internal** (`submit.production`
v `app/eas.json`).

**První vydání nemusíš nahrávat rukou.** Dokumentace Expa to říká
výslovně: `eas submit` umí vytvořit i první vydání aplikace, a to právě na
interním tracku. Aplikace musí v Play Console jen **existovat** — což už
platí.

Zbývají pak dvě věci, které klíč neřeší a jsou taky jednorázové:

1. **Přidat Miloše jako testera** (Play Console → interní testování →
   seznam testerů, e-mail jeho účtu Google).
2. **Zkopírovat odkaz pro testery** a vložit ho do `PLAY_URL`
   v `deploy/docker-compose.yml`. Odkaz se objeví teprve u aplikace ve
   stavu *Published*; než tam bude, stránka `/appka` rozdává soubor jako
   dřív.

## Když klíč někdy vymění

Postup je týž, jen v části A stačí **Create new key** u existujícího účtu
a v části C **Upload new key** přepíše ten starý. Starý klíč pak v Google
Cloudu smaž — do té doby platí oba.
