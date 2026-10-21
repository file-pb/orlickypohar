using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Trasy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Trasy",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LokalniId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    LodId = table.Column<int>(type: "integer", nullable: true),
                    LodNazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ZavodId = table.Column<int>(type: "integer", nullable: true),
                    RegataNazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Zdroj = table.Column<int>(type: "integer", nullable: false),
                    Zacatek = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Konec = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PosunMs = table.Column<long>(type: "bigint", nullable: true),
                    NahranoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PosledniDavkaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Dokoncena = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trasy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Trasy_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Trasy_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Trasy_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TrasaBody",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrasaId = table.Column<int>(type: "integer", nullable: false),
                    LokalniId = table.Column<long>(type: "bigint", nullable: false),
                    Sirka = table.Column<double>(type: "double precision", nullable: false),
                    Delka = table.Column<double>(type: "double precision", nullable: false),
                    PresnostM = table.Column<double>(type: "double precision", nullable: true),
                    RychlostMS = table.Column<double>(type: "double precision", nullable: true),
                    Kurz = table.Column<double>(type: "double precision", nullable: true),
                    VyskaM = table.Column<double>(type: "double precision", nullable: true),
                    CasGps = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CasZarizeni = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Podvrzeny = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrasaBody", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrasaBody_Trasy_TrasaId",
                        column: x => x.TrasaId,
                        principalTable: "Trasy",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrasaBody_TrasaId_CasGps",
                table: "TrasaBody",
                columns: new[] { "TrasaId", "CasGps" });

            migrationBuilder.CreateIndex(
                name: "IX_TrasaBody_TrasaId_LokalniId",
                table: "TrasaBody",
                columns: new[] { "TrasaId", "LokalniId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_LodId",
                table: "Trasy",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_UzivatelId_LokalniId",
                table: "Trasy",
                columns: new[] { "UzivatelId", "LokalniId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_ZavodId",
                table: "Trasy",
                column: "ZavodId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TrasaBody");

            migrationBuilder.DropTable(
                name: "Trasy");
        }
    }
}
