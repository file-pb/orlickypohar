using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PravidlaSerialu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PosunDoSerie",
                table: "Zavody",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PocetSkrtu",
                table: "Serie",
                type: "integer",
                nullable: false,
                // Stávající ročníky škrtaly jednu zastávku; nula by jim škrt
                // tiše vzala a přepočítala pořadí.
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PosunDoSerie",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "PocetSkrtu",
                table: "Serie");
        }
    }
}
