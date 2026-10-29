using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class OkolnostiRozhodnuti : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OkolnostiRozhodnuti",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    RozjizdkaId = table.Column<int>(type: "integer", nullable: true),
                    PrihlaskaId = table.Column<int>(type: "integer", nullable: true),
                    Druh = table.Column<int>(type: "integer", nullable: false),
                    KdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    KdyRozhodl = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    KdyZapsano = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PosunCasu = table.Column<int>(type: "integer", nullable: false),
                    Sirka = table.Column<double>(type: "double precision", nullable: true),
                    Delka = table.Column<double>(type: "double precision", nullable: true),
                    PresnostM = table.Column<double>(type: "double precision", nullable: true),
                    Poznamka = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OkolnostiRozhodnuti", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OkolnostiRozhodnuti_Prihlasky_PrihlaskaId",
                        column: x => x.PrihlaskaId,
                        principalTable: "Prihlasky",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OkolnostiRozhodnuti_Rozjizdky_RozjizdkaId",
                        column: x => x.RozjizdkaId,
                        principalTable: "Rozjizdky",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OkolnostiRozhodnuti_Uzivatele_KdoId",
                        column: x => x.KdoId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OkolnostiRozhodnuti_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OkolnostiRozhodnuti_KdoId",
                table: "OkolnostiRozhodnuti",
                column: "KdoId");

            migrationBuilder.CreateIndex(
                name: "IX_OkolnostiRozhodnuti_PrihlaskaId",
                table: "OkolnostiRozhodnuti",
                column: "PrihlaskaId");

            migrationBuilder.CreateIndex(
                name: "IX_OkolnostiRozhodnuti_RozjizdkaId",
                table: "OkolnostiRozhodnuti",
                column: "RozjizdkaId");

            migrationBuilder.CreateIndex(
                name: "IX_OkolnostiRozhodnuti_ZavodId",
                table: "OkolnostiRozhodnuti",
                column: "ZavodId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OkolnostiRozhodnuti");
        }
    }
}
