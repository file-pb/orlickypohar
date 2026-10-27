# Den závodu

Co dělat, když o závodním víkendu něco leží, v jakém pořadí — a hlavně **co
nedělat**. Vzniklo proto, že tím postupem byl do 9. 10. 2026 Filip a jeho
paměť (audit 8. 10. 2026).

Připojení na server a cesty jsou v `platform/docs/PROVOZ.md`, oddíl *Kde co
běží*. Tenhle soubor řeší jen to, co je na Orlickém poháru zvláštní.

## Napřed: dump před nasazením

**Migrace jdou při startu.** `Program.cs` volá `MigrateAsync()` při každém
náběhu, takže nasazení a změna schématu jsou jedna událost a mezi ně se nedá
nic vložit. Nejbližší bod obnovy je noční záloha z platformy
(`scripts/backup.sh`, `pg_dump -Fc` do S3) — tedy **až 24 hodin stará**.
O závodním víkendu je to den zápisů z vody.

Před každým nasazením v závodní dny tedy ručně:

```bash
ssh deploy@<server> 'cd /opt/platform/stack && docker compose exec -T postgres \
  pg_dump -U postgres -Fc orlickypohar' > orlickypohar-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Databáze se jmenuje stejně jako projekt — jméno slouží zároveň jako databáze,
role i subdoména.

**Nejlepší postup je ale nenasazovat.** Oprava, která počká do pondělí, má
počkat do pondělí: každé nasazení je výměna kontejneru, migrace a okno, ve
kterém web chvíli neodpovídá.

## Když něco leží

Pořadí není libovolné — každý krok odpovídá na jinou otázku a ten další má
smysl, teprve když první neodpoví.

1. **Co běží?** `/verze` obou služeb a porovnat s `main`.

   ```bash
   curl -s https://orlickypohar.klihovka.cz/verze
   curl -s https://orlickypohar-api.klihovka.cz/verze
   ```

2. **Jak to leží?** Rozliš podle toho, co přijde:

   | Co vidíš | Co to znamená |
   |---|---|
   | stránka webu s hláškou o výpadku (stav 200) | web běží, **API ne** — `Vypadek` se vykresluje jako součást stránky |
   | holé `404 page not found` v prostém textu | Traefik nemá kam poslat požadavek — **kontejner neběží**, nebo se zrovna vyměňuje |
   | nic, časový limit | leží celý server nebo síť |

   Krátké 404 **během nasazení je normální**: je to okno mezi starou a novou
   službou, ne porucha.

3. **`/health`** obou služeb. `Healthy` znamená, že služba naběhla — neříká,
   že na ní běží ta verze, kterou čekáš. Na to je krok 1.

4. **Poslední běh `build-deploy`** (`gh run list --branch main --limit 3`).
   Červená úloha `nasazeni` u **staršího** běhu není porucha: ten běh po
   odeslání přečetl `/verze`, našel novější SHA a skončil chybou, místo aby
   tvrdil úspěch.

5. **Na serveru** `cd /opt/apps/orlickypohar && docker compose ps` a logy
   služby, která nejede.

## Co se nesmí

**Nasadit starší commit nejde a `obnova` to neřeší.** Úloha `nasazeni` má krok
*Nevracet produkci do minulosti*: když je nasazovaný commit předkem toho, co
běží, nastaví `nasadit=ne` a Deploy se přeskočí. Volba `obnova` tuhle větev
**nikde neobchází** — pouští jen případ, kdy se `/verze` nedá přečíst.

Cesta zpět je tedy **`git revert` a push**: vznikne nový commit, který předkem
běžícího není, a projde normální cestou.

**`obnova = true` je na dva jiné případy:**

- `/verze` nejde přečíst (produkce leží), a přesto se musí nasadit;
- **háček a produkce se rozešly** — háček si pamatuje novější commit, než
  jaký na produkci skutečně běží. Stalo se to 9. 10. 2026 po dvou slouženích
  hned za sebou. `X-Deploy-Obnova: ano` v hlavičce pak háček přesvědčí
  (`proc_nenasazovat` v `platform/deploy-hook/hook.py` propustí všechno, když
  je obnova zapnutá), jinak vrací 409.

Pouští se to ručně: `build-deploy` nad `main` s volbou `obnova`.

**Neslučovat dvě PR hned za sebou.** Právě tím ten rozchod 9. 10. vznikl.
Jedno po druhém a počkat, až `/verze` obou služeb sedí s `main`.

## Zápis z vody, když web leží

Rozdělaný zápis **přežije** — leží v `localStorage` prohlížeče
(`koncept.ts` u zápisu výsledků), a **od 28. 10. 2026 i klepnutí na
start**: dřív se zahodilo a obrazovka poradila *„zkus to znovu"*, což
u startu splnit nejde (nález R19 v `docs/OPONENTURA-ROZHODCI.md`). Co
nepřežije, je **načtení stránky bez signálu**: web nemá service worker ani
manifest, takže jedno obnovení cílovou obrazovku sebere.

Takže u vody: **kartu nezavírat a neobnovovat.** Když signál spadne,
nechat ji být a zapisovat dál; odešle se, až se připojení vrátí.

## Kdo co může

Import ročníku a produkční databáze jsou Filipovy — konfiguraci ani
produkční data nikdo jiný nečte. Pořadatel a rozhodčí mají svoje role ve
správě; co která smí, drží `web/lib/co-smim.ts` a na serveru `Prava.Smi`.
