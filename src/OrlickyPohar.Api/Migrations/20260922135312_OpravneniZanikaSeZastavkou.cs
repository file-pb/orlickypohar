using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class OpravneniZanikaSeZastavkou : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Opravneni_Zavody_ZavodId",
                table: "Opravneni");

            migrationBuilder.AddForeignKey(
                name: "FK_Opravneni_Zavody_ZavodId",
                table: "Opravneni",
                column: "ZavodId",
                principalTable: "Zavody",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Opravneni_Zavody_ZavodId",
                table: "Opravneni");

            migrationBuilder.AddForeignKey(
                name: "FK_Opravneni_Zavody_ZavodId",
                table: "Opravneni",
                column: "ZavodId",
                principalTable: "Zavody",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
