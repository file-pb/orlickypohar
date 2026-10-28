using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class UkonyZaJizdy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UkonyZaJizdy",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RozjizdkaId = table.Column<int>(type: "integer", nullable: false),
                    Druh = table.Column<int>(type: "integer", nullable: false),
                    PrvekId = table.Column<int>(type: "integer", nullable: false),
                    Kurz = table.Column<int>(type: "integer", nullable: true),
                    Delka = table.Column<int>(type: "integer", nullable: false),
                    NahradniSirka = table.Column<double>(type: "double precision", nullable: true),
                    NahradniDelka = table.Column<double>(type: "double precision", nullable: true),
                    Poznamka = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    VyhlasenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    VyhlasilId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UkonyZaJizdy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UkonyZaJizdy_PrvkyTrati_PrvekId",
                        column: x => x.PrvekId,
                        principalTable: "PrvkyTrati",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UkonyZaJizdy_Rozjizdky_RozjizdkaId",
                        column: x => x.RozjizdkaId,
                        principalTable: "Rozjizdky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UkonyZaJizdy_Uzivatele_VyhlasilId",
                        column: x => x.VyhlasilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UkonyZaJizdy_PrvekId",
                table: "UkonyZaJizdy",
                column: "PrvekId");

            migrationBuilder.CreateIndex(
                name: "IX_UkonyZaJizdy_RozjizdkaId_VyhlasenoV",
                table: "UkonyZaJizdy",
                columns: new[] { "RozjizdkaId", "VyhlasenoV" });

            migrationBuilder.CreateIndex(
                name: "IX_UkonyZaJizdy_VyhlasilId",
                table: "UkonyZaJizdy",
                column: "VyhlasilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UkonyZaJizdy");
        }
    }
}
