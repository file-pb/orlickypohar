using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PlachetniSmernice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Smernice",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    Verze = table.Column<int>(type: "integer", nullable: false),
                    Nazev = table.Column<string>(type: "text", nullable: false),
                    Velikost = table.Column<long>(type: "bigint", nullable: false),
                    Poznamka = table.Column<string>(type: "text", nullable: true),
                    VyvesilId = table.Column<Guid>(type: "uuid", nullable: false),
                    VyveseneV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Smernice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Smernice_Uzivatele_VyvesilId",
                        column: x => x.VyvesilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Smernice_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Smernice_VyvesilId",
                table: "Smernice",
                column: "VyvesilId");

            migrationBuilder.CreateIndex(
                name: "IX_Smernice_ZavodId",
                table: "Smernice",
                column: "ZavodId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Smernice");
        }
    }
}
