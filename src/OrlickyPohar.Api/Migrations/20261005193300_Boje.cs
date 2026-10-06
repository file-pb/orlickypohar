using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Boje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Boje",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    Nazev = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Poradi = table.Column<int>(type: "integer", nullable: false),
                    Sirka = table.Column<double>(type: "double precision", nullable: false),
                    Delka = table.Column<double>(type: "double precision", nullable: false),
                    PresnostM = table.Column<double>(type: "double precision", nullable: true),
                    PostavenaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PostavilId = table.Column<Guid>(type: "uuid", nullable: false),
                    NahrazujeId = table.Column<int>(type: "integer", nullable: true),
                    SebranaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NahrazenaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Boje", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Boje_Boje_NahrazujeId",
                        column: x => x.NahrazujeId,
                        principalTable: "Boje",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Boje_Uzivatele_PostavilId",
                        column: x => x.PostavilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Boje_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Boje_NahrazujeId",
                table: "Boje",
                column: "NahrazujeId");

            migrationBuilder.CreateIndex(
                name: "IX_Boje_PostavilId",
                table: "Boje",
                column: "PostavilId");

            migrationBuilder.CreateIndex(
                name: "IX_Boje_ZavodId_NahrazenaV_SebranaV",
                table: "Boje",
                columns: new[] { "ZavodId", "NahrazenaV", "SebranaV" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Boje");
        }
    }
}
