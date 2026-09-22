# Logo Orlik Yacht Series — zdroj

Vektor od rozhodčího seriálu, tak jak přišel (22. 9. 2026):

- `Logo_Orlik_Yacht_Series_vektor.eps` — CorelDRAW X5, z něj se převádí
- `Logo_Orlik_Yacht_Series.pdf` — totéž logo na A4, podle něj je změřená barva

Jedna barva, CMYK 96/63/20/36. Na obrazovce `#113b59` (změřeno z PDF
vykresleného v macOS do sRGB), v tmavém vzhledu webu `#7fa7c9`.

**Proč to není v `public/`:** nic z toho web neservíruje a 1,4 MB PDF
by šlo stáhnout jen proto, že leží ve špatné složce. Pro další použití jsou
v `public/logo/orlik-yacht-series/` hotová SVG a PNG ve světlé i tmavé
variantě. Next do image kopíruje jen `public/` a sestavenou aplikaci, takže
tahle složka do nasazení nejde.

Převod dělá `python3 web/scripts/logo.py` (potřebuje jen Pillow).
