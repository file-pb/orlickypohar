# Schémata

Vykreslená schémata řešení. **Jsou to snímky k datu, ne živý zdroj pravdy** —
nic je nepřegeneruje, když se kód změní. Proto mají v názvu datum a starší
se nemažou: dvě schémata vedle sebe ukazují, co se za tu dobu změnilo.

Živé je naproti tomu [PLAN.md](../PLAN.md) a samotný kód. Když se rozejdou,
platí kód.

## Ke každému schématu patří prompt, kterým vzniklo

Dvojice se stejným datem v názvu: `*.pdf` je výstup, `*-prompt.md` zdroj.
Bez promptu by se schéma dalo jen překreslit od nuly; s ním se příště jen
doplní, co přibylo, a nechá se vykreslit znovu.

| Datum | Schéma | Prompt |
|---|---|---|
| 9. 9. 2026 | [`2026-09-09-schema-reseni.pdf`](2026-09-09-schema-reseni.pdf) | [`2026-09-09-schema-reseni-prompt.md`](2026-09-09-schema-reseni-prompt.md) |

Obsah k 9. 9. 2026: tři vrstvy — nasazení a provoz, vnitřek API, datový
model. Hotové fáze 0 až 3 a blog, rozdělaná identita, plánované fotky
v objektovém úložišti a upozornění.

## Jak vzniká další

1. Vezmi poslední prompt a **uprav ho**, ať odpovídá dnešku — hlavně
   barevné stavy: co bylo plánované a je hotové, co přibylo.
2. Nech podle něj vykreslit schéma.
3. Ulož obojí sem s **novým datem**. Předchozí dvojici nech být.

Prompt je psaný tak, aby byl soběstačný — nepředpokládá přístup
k repozitáři, takže se dá dát komukoliv. Počítá s nástrojem, který kreslí
diagramy, ne s generátorem obrázků; ten by vyrobil hezký obrázek
s nesmyslnými popiskami.

## Platformní schémata jsou jinde

Server, síť, zálohy a nasazovací řetěz žijí v
[platform/docs/SCHEMATA.md](https://github.com/file-pb/platform/blob/main/docs/SCHEMATA.md).
Tam jsou kreslená v Mermaidu, takže je GitHub vykreslí sám a dají se
upravovat jako text — u schématu, které se mění často, je to lepší než PDF.
