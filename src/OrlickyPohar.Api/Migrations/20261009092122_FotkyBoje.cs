using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class FotkyBoje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pořadí je ruční, ne jak to vygeneroval EF: ten nejdřív zahodil
            // `Boje.FotkaId` a teprve pak přidal novou vazbu, takže by fotka
            // přiložená k bóji zmizela. Tady se nejdřív postaví nové místo,
            // pak se do něj data přenesou a teprve nakonec zmizí staré.
            migrationBuilder.AddColumn<int>(
                name: "UBojeId",
                table: "Fotky",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Fotky_UBojeId",
                table: "Fotky",
                column: "UBojeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Fotky_Boje_UBojeId",
                table: "Fotky",
                column: "UBojeId",
                principalTable: "Boje",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Jedna fotka u bóje se stane první z několika. Web k tomu
            // endpointu zatím není, takže se nejspíš nepřenese nic — ale
            // „nejspíš" není důvod data zahodit.
            migrationBuilder.Sql(
                """
                UPDATE "Fotky" SET "UBojeId" = b."Id"
                FROM "Boje" b
                WHERE b."FotkaId" = "Fotky"."Id";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Boje_Fotky_FotkaId",
                table: "Boje");

            migrationBuilder.DropIndex(
                name: "IX_Boje_FotkaId",
                table: "Boje");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "Boje");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Fotky_Boje_UBojeId",
                table: "Fotky");

            migrationBuilder.DropIndex(
                name: "IX_Fotky_UBojeId",
                table: "Fotky");

            migrationBuilder.DropColumn(
                name: "UBojeId",
                table: "Fotky");

            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "Boje",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Boje_FotkaId",
                table: "Boje",
                column: "FotkaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Boje_Fotky_FotkaId",
                table: "Boje",
                column: "FotkaId",
                principalTable: "Fotky",
                principalColumn: "Id");
        }
    }
}
