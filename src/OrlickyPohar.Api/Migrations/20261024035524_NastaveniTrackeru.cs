using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class NastaveniTrackeru : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NastaveniTrackeru",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    CoVidiPosadky = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    ZivyPrenosVen = table.Column<bool>(type: "boolean", nullable: false),
                    JizdyPoRegateVerejne = table.Column<bool>(type: "boolean", nullable: false),
                    ZamcenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NastaveniTrackeru", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NastaveniTrackeru_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ZmenyNastaveniTrackeru",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NastaveniId = table.Column<int>(type: "integer", nullable: false),
                    Kdy = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    ZPosadky = table.Column<int>(type: "integer", nullable: false),
                    NaPosadky = table.Column<int>(type: "integer", nullable: false),
                    ZVen = table.Column<bool>(type: "boolean", nullable: false),
                    NaVen = table.Column<bool>(type: "boolean", nullable: false),
                    ZJizdy = table.Column<bool>(type: "boolean", nullable: false),
                    NaJizdy = table.Column<bool>(type: "boolean", nullable: false),
                    Duvod = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PoZamku = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZmenyNastaveniTrackeru", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZmenyNastaveniTrackeru_NastaveniTrackeru_NastaveniId",
                        column: x => x.NastaveniId,
                        principalTable: "NastaveniTrackeru",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NastaveniTrackeru_ZavodId",
                table: "NastaveniTrackeru",
                column: "ZavodId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyNastaveniTrackeru_NastaveniId",
                table: "ZmenyNastaveniTrackeru",
                column: "NastaveniId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZmenyNastaveniTrackeru");

            migrationBuilder.DropTable(
                name: "NastaveniTrackeru");
        }
    }
}
