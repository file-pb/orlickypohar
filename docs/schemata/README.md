# Schémata

Vykreslená schémata řešení. **Jsou to snímky k datu, ne živý zdroj pravdy** —
nic je nepřegeneruje, když se kód změní. Proto mají v názvu datum a starší
se nemažou: dvě schémata vedle sebe ukazují, co se za tu dobu změnilo.

Živé je naproti tomu [PLAN.md](../PLAN.md) a samotný kód. Když se rozejdou,
platí kód.

| Soubor | Co je na něm |
|---|---|
| `2026-09-09-schema-reseni.pdf` | Celé řešení ve třech vrstvách: nasazení a provoz, vnitřek API, datový model. Stav k 9. 9. 2026 — hotové fáze 0 až 3 a blog, rozdělaná identita, plánované fotky v S3 a upozornění. |

Platformní schémata (server, síť, zálohy, nasazovací řetěz) žijí zvlášť,
v [platform/docs/SCHEMATA.md](https://github.com/file-pb/platform/blob/main/docs/SCHEMATA.md).
Tam jsou kreslená v Mermaidu, takže je GitHub vykreslí sám a dají se
upravovat jako text — u schématu, které se mění často, je to lepší než PDF.
