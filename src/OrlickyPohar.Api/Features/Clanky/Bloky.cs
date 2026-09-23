using System.Text.Json;
using System.Text.Json.Serialization;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>Kus textu v jednom stylu. Delší úsek se rozpadne na víc těchhle.</summary>
public record Usek(
    string Text,
    bool Tucne = false,
    bool Kurziva = false,
    /// <summary>Cíl odkazu, absolutní http(s) nebo mailto. Jinak prázdné.</summary>
    string? Odkaz = null);

public enum DruhBloku
{
    Odstavec = 0,
    Nadpis = 1,
    Seznam = 2,
    Obrazek = 3,
}

/// <summary>
/// Jeden blok těla článku. Je to <b>úzká množina</b>, ne obecné HTML: co se
/// do ní nevejde, se zahodí.
/// </summary>
public record Blok(
    DruhBloku Druh,
    /// <summary>Odstavec a nadpis.</summary>
    IReadOnlyList<Usek>? Useky = null,
    /// <summary>Nadpis: 2 nebo 3. Titulek článku je na stránce h1.</summary>
    int Uroven = 0,
    /// <summary>Seznam: každá položka je vlastní řádka úseků.</summary>
    IReadOnlyList<IReadOnlyList<Usek>>? Polozky = null,
    bool Cislovany = false,
    /// <summary>Obrázek: absolutní http(s) adresa.</summary>
    string? Adresa = null,
    string? Popis = null);

/// <summary>
/// Převod vloženého HTML na bloky, které web umí vykreslit.
///
/// <para>
/// <b>Proč se nevrací vyčištěné HTML.</b> Obvyklá cesta je whitelist značek
/// a pak <c>dangerouslySetInnerHTML</c>; bezpečnost pak stojí na tom, že
/// whitelist nemá díru. Tady se místo toho vrací struktura, kterou web
/// vykreslí vlastními komponentami — <b>surové HTML se do stránky nedostane
/// nikdy</b>. Chyba v rozboru pak znamená špatně zobrazený text, ne XSS.
/// Je to bezpečné konstrukcí, ne úplností seznamu.
/// </para>
///
/// <para>
/// <b>Proč vlastní rozbor a ne knihovna.</b> Pracovní stroj se na nuget.org
/// nedostane (<c>Socket is not connected</c>), takže <c>HtmlSanitizer</c> ani
/// <c>AngleSharp</c> přidat nešlo. Pro tenhle účel to nevadí: nepotřebujeme
/// plnou specifikaci HTML5, ale rozpoznat hrstku značek a všechno ostatní
/// zahodit. Kdyby se knihovna jednou přidala, nahradí jen tenhle soubor —
/// tvar bloků zůstane.
/// </para>
///
/// <para>
/// <b>Co se čeká na vstupu:</b> schránka z Wordu nebo kus cizí stránky.
/// Word nese <c>mso-*</c> styly, vlastní fonty, pevné velikosti v bodech,
/// <c>&lt;o:p&gt;</c> a podmíněné komentáře; nic z toho nepřežije, protože
/// se berou jen značky ze seznamu a z atributů jen <c>href</c>, <c>src</c>
/// a <c>alt</c>.
/// </para>
/// </summary>
public static class Bloky
{
    /// <summary>
    /// Značky, jejichž <b>obsah</b> se zahazuje i s textem. U ostatních
    /// neznámých se značka ignoruje, ale text uvnitř zůstane — u těchhle by
    /// to znamenalo vysypat do článku javascript nebo styly jako text.
    /// </summary>
    private static readonly HashSet<string> SeZahozenymObsahem = new(StringComparer.OrdinalIgnoreCase)
    {
        "script", "style", "head", "title", "noscript", "template",
        "svg", "math", "iframe", "object", "embed", "applet",
    };

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
    };

    /// <summary>Uložený tvar těla: bloky jako JSON.</summary>
    public static string Uloz(IReadOnlyList<Blok> bloky) => JsonSerializer.Serialize(bloky, Json);

    /// <summary>
    /// Přečte uložené tělo. Nečitelné vrátí prázdné — článek s rozbitým
    /// tělem se má ukázat bez něj, ne shodit stránku.
    /// </summary>
    public static IReadOnlyList<Blok> Nacti(string? telo)
    {
        if (string.IsNullOrWhiteSpace(telo)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<Blok>>(telo, Json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Zpátky do HTML, aby šel článek znovu upravit. Vrací <b>jen to, co
    /// bloky unesou</b> — je to tedy už vyčištěný tvar, ne původní vložený
    /// text; z něj se do bloků nic nového nedostane a druhý průchod dá totéž.
    /// <para>
    /// Není to obnova originálu a nemá být: co čistička zahodila, je pryč
    /// právem. Autor uvidí, co se doopravdy uložilo.
    /// </para>
    /// </summary>
    public static string DoHtml(IReadOnlyList<Blok> bloky)
    {
        var text = new System.Text.StringBuilder();
        foreach (var b in bloky)
        {
            switch (b.Druh)
            {
                case DruhBloku.Nadpis:
                    var uroven = b.Uroven == 3 ? "h3" : "h2";
                    text.Append($"<{uroven}>").Append(Radka(b.Useky)).Append($"</{uroven}>\n");
                    break;

                case DruhBloku.Seznam:
                    var znacka = b.Cislovany ? "ol" : "ul";
                    text.Append($"<{znacka}>");
                    foreach (var p in b.Polozky ?? []) text.Append("<li>").Append(Radka(p)).Append("</li>");
                    text.Append($"</{znacka}>\n");
                    break;

                case DruhBloku.Obrazek:
                    text.Append($"""<img src="{Uvozovky(b.Adresa)}" alt="{Uvozovky(b.Popis)}">""").Append('\n');
                    break;

                default:
                    text.Append("<p>").Append(Radka(b.Useky)).Append("</p>\n");
                    break;
            }
        }

        return text.ToString().TrimEnd();
    }

    private static string Radka(IReadOnlyList<Usek>? useky)
    {
        var text = new System.Text.StringBuilder();
        foreach (var u in useky ?? [])
        {
            var obsah = Escapuj(u.Text);
            if (u.Tucne) obsah = $"<b>{obsah}</b>";
            if (u.Kurziva) obsah = $"<i>{obsah}</i>";
            if (u.Odkaz is { } kam) obsah = $"""<a href="{Uvozovky(kam)}">{obsah}</a>""";
            text.Append(obsah);
        }

        return text.ToString();
    }

    /// <summary>Text do HTML. Bez tohohle by `&lt;` z článku vyrobilo značku.</summary>
    private static string Escapuj(string text) =>
        text.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    private static string Uvozovky(string? hodnota) =>
        Escapuj(hodnota ?? "").Replace("\"", "&quot;");

    /// <summary>Převede vložené HTML na bloky.</summary>
    public static IReadOnlyList<Blok> ZHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return [];

        var stavitel = new Stavitel();
        foreach (var token in Tokeny(html)) stavitel.Vezmi(token);
        return stavitel.Hotovo();
    }

    // --- Tokenizér ---------------------------------------------------------
    //
    // Tolerantní schválně: cizí HTML bývá nevalidní a nedovřené značky jsou
    // v něm pravidlo, ne výjimka. Co se nedá přečíst, se přeskočí.

    private enum DruhTokenu { Text, Otevirac, Zavirac }

    private record Token(DruhTokenu Druh, string Nazev = "", string Text = "", string? Odkaz = null, string? Popis = null);

    private static IEnumerable<Token> Tokeny(string html)
    {
        var i = 0;
        while (i < html.Length)
        {
            var spicka = html.IndexOf('<', i);
            if (spicka < 0)
            {
                if (i < html.Length) yield return new Token(DruhTokenu.Text, Text: html[i..]);
                yield break;
            }

            if (spicka > i) yield return new Token(DruhTokenu.Text, Text: html[i..spicka]);

            // Komentář, včetně podmíněných od Wordu (`<!--[if gte mso 9]>`).
            if (html.AsSpan(spicka).StartsWith("<!--"))
            {
                var konecKomentare = html.IndexOf("-->", spicka, StringComparison.Ordinal);
                i = konecKomentare < 0 ? html.Length : konecKomentare + 3;
                continue;
            }

            var konec = html.IndexOf('>', spicka);
            if (konec < 0)
            {
                // Nedovřená špička na konci vstupu: zbytek je text.
                yield return new Token(DruhTokenu.Text, Text: html[spicka..]);
                yield break;
            }

            var uvnitr = html[(spicka + 1)..konec].Trim();
            i = konec + 1;

            if (uvnitr.Length == 0 || uvnitr[0] == '!' || uvnitr[0] == '?') continue;

            var zavirac = uvnitr[0] == '/';
            if (zavirac) uvnitr = uvnitr[1..];

            var mezera = uvnitr.AsSpan().IndexOfAny(" \t\r\n/".AsSpan());
            var nazev = (mezera < 0 ? uvnitr : uvnitr[..mezera]).ToLowerInvariant();
            // `o:p` a spol. od Wordu: jmenný prostor zahodíme, značku stejně
            // neznáme a zajímá nás jen to, že to není `script`.
            if (nazev.Contains(':')) nazev = nazev[(nazev.IndexOf(':') + 1)..];
            if (nazev.Length == 0) continue;

            if (zavirac)
            {
                yield return new Token(DruhTokenu.Zavirac, nazev);
                continue;
            }

            var atributy = mezera < 0 ? "" : uvnitr[mezera..];
            yield return new Token(
                DruhTokenu.Otevirac, nazev,
                Odkaz: Atribut(atributy, nazev == "a" ? "href" : "src"),
                Popis: Atribut(atributy, "alt"));
        }
    }

    /// <summary>
    /// Hodnota atributu. Bere jen uvozovkované — nekótovaná hodnota se
    /// v cizím HTML plete s dalšími atributy a nestojí to za hádání.
    /// </summary>
    private static string? Atribut(string atributy, string jmeno)
    {
        var od = 0;
        while (true)
        {
            var kde = atributy.IndexOf(jmeno, od, StringComparison.OrdinalIgnoreCase);
            if (kde < 0) return null;
            od = kde + jmeno.Length;

            // Musí stát samostatně: `data-href` není `href`.
            if (kde > 0 && (char.IsLetterOrDigit(atributy[kde - 1]) || atributy[kde - 1] is '-' or '_')) continue;

            var zbytek = atributy.AsSpan(od).TrimStart();
            if (zbytek.Length == 0 || zbytek[0] != '=') continue;

            zbytek = zbytek[1..].TrimStart();
            if (zbytek.Length == 0 || (zbytek[0] != '"' && zbytek[0] != '\'')) continue;

            var uvozovka = zbytek[0];
            var konec = zbytek[1..].IndexOf(uvozovka);
            if (konec < 0) continue;

            return System.Net.WebUtility.HtmlDecode(zbytek[1..(konec + 1)].ToString()).Trim();
        }
    }

    /// <summary>
    /// Adresa, kterou pustíme ven. Jen absolutní http(s), u odkazů i mailto.
    /// Relativní by se musela skládat vůči cizí stránce a <c>javascript:</c>
    /// ani <c>data:</c> v odkazu nemá co dělat.
    /// </summary>
    private static string? Adresa(string? hodnota, bool mailtoTaky)
    {
        if (string.IsNullOrWhiteSpace(hodnota)) return null;

        // Uvozovky, špičky a bílé znaky do adresy nepatří. `Uri.TryCreate` je
        // překvapivě spolkne, a i když je zápis do atributu escapuje, nemá
        // smysl takovou adresu vůbec uložit — do `src` se nedostane nic, co
        // by se muselo hlídat až na výstupu.
        if (hodnota.AsSpan().IndexOfAny("\"'<> \t\r\n".AsSpan()) >= 0) return null;

        if (!Uri.TryCreate(hodnota, UriKind.Absolute, out var uri)) return null;

        return uri.Scheme == Uri.UriSchemeHttps
               || uri.Scheme == Uri.UriSchemeHttp
               || (mailtoTaky && uri.Scheme == Uri.UriSchemeMailto)
            ? hodnota
            : null;
    }

    // --- Skládání bloků ----------------------------------------------------

    private sealed class Stavitel
    {
        private readonly List<Blok> _bloky = [];
        private readonly List<Usek> _useky = [];
        private readonly List<IReadOnlyList<Usek>> _polozky = [];

        private int _tucne;
        private int _kurziva;
        private string? _odkaz;

        private int _nadpis;          // úroveň rozepsaného nadpisu, 0 = žádný
        private int _seznam;          // zanoření seznamu, 0 = mimo
        private bool _cislovany;
        private bool _vPolozce;
        private int _zahazuje;        // zanoření uvnitř script/style/…

        public void Vezmi(Token token)
        {
            switch (token.Druh)
            {
                case DruhTokenu.Text when _zahazuje == 0:
                    PridejText(token.Text);
                    break;

                case DruhTokenu.Otevirac:
                    Otevri(token);
                    break;

                case DruhTokenu.Zavirac:
                    Zavri(token.Nazev);
                    break;
            }
        }

        private void Otevri(Token token)
        {
            if (SeZahozenymObsahem.Contains(token.Nazev))
            {
                _zahazuje++;
                return;
            }

            if (_zahazuje > 0) return;

            switch (token.Nazev)
            {
                case "p" or "div" or "blockquote":
                    UzavriOdstavec();
                    break;

                case "br":
                    PridejText(" ");
                    break;

                case "h1" or "h2":
                    UzavriOdstavec();
                    // h1 patří titulku článku, který stránka vypisuje sama.
                    _nadpis = 2;
                    break;

                case "h3" or "h4" or "h5" or "h6":
                    UzavriOdstavec();
                    _nadpis = 3;
                    break;

                case "ul" or "ol":
                    UzavriOdstavec();
                    _seznam++;
                    _cislovany = token.Nazev == "ol";
                    break;

                case "li" when _seznam > 0:
                    UzavriPolozku();
                    _vPolozce = true;
                    break;

                case "b" or "strong":
                    _tucne++;
                    break;

                case "i" or "em":
                    _kurziva++;
                    break;

                case "a":
                    _odkaz = Adresa(token.Odkaz, mailtoTaky: true);
                    break;

                case "img":
                    if (Adresa(token.Odkaz, mailtoTaky: false) is { } adresa)
                    {
                        UzavriOdstavec();
                        _bloky.Add(new Blok(DruhBloku.Obrazek, Adresa: adresa,
                            Popis: string.IsNullOrWhiteSpace(token.Popis) ? null : token.Popis));
                    }

                    break;

                // Cokoliv jiného — span, font, table, o:p — se ignoruje.
                // Text uvnitř projde, značka ne.
            }
        }

        private void Zavri(string nazev)
        {
            if (SeZahozenymObsahem.Contains(nazev))
            {
                if (_zahazuje > 0) _zahazuje--;
                return;
            }

            if (_zahazuje > 0) return;

            switch (nazev)
            {
                case "p" or "div" or "blockquote":
                    UzavriOdstavec();
                    break;

                case "h1" or "h2" or "h3" or "h4" or "h5" or "h6":
                    UzavriOdstavec();
                    break;

                case "ul" or "ol":
                    UzavriPolozku();
                    UzavriSeznam();
                    break;

                case "li":
                    UzavriPolozku();
                    break;

                case "b" or "strong":
                    if (_tucne > 0) _tucne--;
                    break;

                case "i" or "em":
                    if (_kurziva > 0) _kurziva--;
                    break;

                case "a":
                    _odkaz = null;
                    break;
            }
        }

        private void PridejText(string syrovy)
        {
            var text = System.Net.WebUtility.HtmlDecode(syrovy)
                .Replace(' ', ' ')
                .Replace('\r', ' ')
                .Replace('\n', ' ')
                .Replace('\t', ' ');

            while (text.Contains("  ")) text = text.Replace("  ", " ");
            if (text.Length == 0) return;

            // Mezera na začátku bloku nic nenese.
            if (_useky.Count == 0 && text.Trim().Length == 0) return;

            var tucne = _tucne > 0;
            var kurziva = _kurziva > 0;

            // Navazující text ve stejném stylu patří k předchozímu úseku,
            // jinak by `<b>Ahoj</b><b> světe</b>` dalo dva úseky vedle sebe.
            if (_useky.Count > 0 && _useky[^1] is { } posledni
                && posledni.Tucne == tucne && posledni.Kurziva == kurziva && posledni.Odkaz == _odkaz)
            {
                _useky[^1] = posledni with { Text = posledni.Text + text };
                return;
            }

            _useky.Add(new Usek(text, tucne, kurziva, _odkaz));
        }

        private List<Usek> Sesbirej()
        {
            // Krajní mezery jsou artefakt odsazení v HTML, ne obsah.
            var useky = _useky.ToList();
            _useky.Clear();

            if (useky.Count == 0) return useky;
            useky[0] = useky[0] with { Text = useky[0].Text.TrimStart() };
            useky[^1] = useky[^1] with { Text = useky[^1].Text.TrimEnd() };
            return [.. useky.Where(u => u.Text.Length > 0)];
        }

        private void UzavriOdstavec()
        {
            if (_vPolozce) return;

            var useky = Sesbirej();
            if (useky.Count == 0)
            {
                _nadpis = 0;
                return;
            }

            _bloky.Add(_nadpis > 0
                ? new Blok(DruhBloku.Nadpis, useky, _nadpis)
                : new Blok(DruhBloku.Odstavec, useky));
            _nadpis = 0;
        }

        private void UzavriPolozku()
        {
            if (!_vPolozce) return;
            _vPolozce = false;

            var useky = Sesbirej();
            if (useky.Count > 0) _polozky.Add(useky);
        }

        private void UzavriSeznam()
        {
            if (_seznam > 0) _seznam--;
            if (_seznam > 0 || _polozky.Count == 0) return;

            _bloky.Add(new Blok(DruhBloku.Seznam, Polozky: [.. _polozky], Cislovany: _cislovany));
            _polozky.Clear();
        }

        public IReadOnlyList<Blok> Hotovo()
        {
            UzavriPolozku();
            while (_seznam > 0) UzavriSeznam();
            UzavriOdstavec();
            return _bloky;
        }
    }
}
