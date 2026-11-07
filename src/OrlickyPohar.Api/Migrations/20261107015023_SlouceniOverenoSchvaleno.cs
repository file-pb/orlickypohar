using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <summary>
    /// Ověřeno a Schváleno byly dva kroky, teď je to jeden (nález K3).
    /// <para>
    /// Schéma se nemění — <c>StavVysledku</c> je <c>int</c> a jednička
    /// prostě přestala existovat. Mění se <b>data</b>: co stálo na
    /// „ověřeno", stojí nově na „zapsáno", protože ten krok rozhodčí
    /// stejně dělal hned po něm. Opačný směr by znamenal hádat, které
    /// z dvojek byly původně jedničky, a to z databáze nevyčteš.
    /// </para>
    /// </summary>
    public partial class SlouceniOverenoSchvaleno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """UPDATE "Rozjizdky" SET "StavVysledku" = 2 WHERE "StavVysledku" = 1;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Schválně prázdné. Vrátit jedničky nejde — po sloučení se
            // nedá poznat, která rozjížďka byla jen ověřená a která
            // podepsaná. Návrat na starší verzi API tedy uvidí všechno
            // jako schválené, což je pravdivější než náhodné rozdělení.
        }
    }
}
