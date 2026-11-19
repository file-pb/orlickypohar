using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <summary>
    /// Snímek zápisu umí být i z fotky papíru (oponentura rozhodčího).
    /// <para>
    /// <b>Index se rozšiřuje o `ZPapiru`.</b> Snímek z fotky patří tomu,
    /// kdo ho vložil, a ten u téže rozjížďky obvykle má i svůj ruční —
    /// se starým klíčem by jeden druhý přepsal. Rozšíření je bezpečné:
    /// všechny dosavadní řádky mají `ZPapiru = false`, takže dvojice,
    /// které byly unikátní, zůstávají unikátní i v trojici.
    /// </para>
    /// <para>
    /// <b>`Neprecteno` dostává výchozí prázdné pole</b>, ne jen `NOT NULL`:
    /// PostgreSQL by jinak přidání sloupce do neprázdné tabulky odmítl
    /// a selhalo by to až na produkci, kde snímky jsou.
    /// </para>
    /// </summary>
    public partial class SnimekZPapiru : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ZapisyNavrhu_RozjizdkaId_UzivatelId",
                table: "ZapisyNavrhu");

            migrationBuilder.AddColumn<List<string>>(
                name: "Neprecteno",
                table: "ZapisyNavrhu",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<bool>(
                name: "ZPapiru",
                table: "ZapisyNavrhu",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ZapisyNavrhu_RozjizdkaId_UzivatelId_ZPapiru",
                table: "ZapisyNavrhu",
                columns: new[] { "RozjizdkaId", "UzivatelId", "ZPapiru" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ZapisyNavrhu_RozjizdkaId_UzivatelId_ZPapiru",
                table: "ZapisyNavrhu");

            migrationBuilder.DropColumn(
                name: "Neprecteno",
                table: "ZapisyNavrhu");

            migrationBuilder.DropColumn(
                name: "ZPapiru",
                table: "ZapisyNavrhu");

            migrationBuilder.CreateIndex(
                name: "IX_ZapisyNavrhu_RozjizdkaId_UzivatelId",
                table: "ZapisyNavrhu",
                columns: new[] { "RozjizdkaId", "UzivatelId" },
                unique: true);
        }
    }
}
