using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Clanky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clanky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    ZavodId = table.Column<int>(type: "integer", nullable: true),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Titulek = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Perex = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    Telo = table.Column<string>(type: "text", nullable: false),
                    Autor = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    PublikovanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Publikovano = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clanky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clanky_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Clanky_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Clanky_SerieId_PublikovanoV",
                table: "Clanky",
                columns: new[] { "SerieId", "PublikovanoV" });

            migrationBuilder.CreateIndex(
                name: "IX_Clanky_SerieId_Slug",
                table: "Clanky",
                columns: new[] { "SerieId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clanky_ZavodId",
                table: "Clanky",
                column: "ZavodId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Clanky");
        }
    }
}
