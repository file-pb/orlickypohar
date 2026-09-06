using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ModelPoharu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Measurements");

            migrationBuilder.DropTable(
                name: "Quarantine");

            migrationBuilder.DropTable(
                name: "Metrics");

            migrationBuilder.CreateTable(
                name: "Osoby",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Jmeno = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Prijmeni = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Osoby", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Serie",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Rok = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Publikovano = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Serie", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Lode",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CisloPlachty = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Typ = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    MajitelId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lode", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Lode_Osoby_MajitelId",
                        column: x => x.MajitelId,
                        principalTable: "Osoby",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Kategorie",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    Nazev = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Poradi = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kategorie", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Kategorie_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Zavody",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    Nazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Poradatel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Datum = table.Column<DateOnly>(type: "date", nullable: false),
                    DatumKonce = table.Column<DateOnly>(type: "date", nullable: true),
                    Typ = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    Poradi = table.Column<int>(type: "integer", nullable: false),
                    PocetSkrtu = table.Column<int>(type: "integer", nullable: false),
                    Vyhodnoceni = table.Column<int>(type: "integer", nullable: false),
                    PocetRozjizdekDoSerie = table.Column<int>(type: "integer", nullable: true),
                    KoeficientDoSerie = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Publikovano = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Zavody", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Zavody_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Prihlasky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    KategorieId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Prihlasky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Prihlasky_Kategorie_KategorieId",
                        column: x => x.KategorieId,
                        principalTable: "Kategorie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prihlasky_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Prihlasky_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rozjizdky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    Cislo = table.Column<int>(type: "integer", nullable: false),
                    StartV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Stav = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rozjizdky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rozjizdky_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Ucasti",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    PrihlaskaId = table.Column<int>(type: "integer", nullable: false),
                    KormidelnikId = table.Column<int>(type: "integer", nullable: true),
                    Posadka = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ucasti", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ucasti_Osoby_KormidelnikId",
                        column: x => x.KormidelnikId,
                        principalTable: "Osoby",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ucasti_Prihlasky_PrihlaskaId",
                        column: x => x.PrihlaskaId,
                        principalTable: "Prihlasky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Ucasti_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vysledky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RozjizdkaId = table.Column<int>(type: "integer", nullable: false),
                    UcastId = table.Column<int>(type: "integer", nullable: false),
                    PoradiVCili = table.Column<int>(type: "integer", nullable: true),
                    DojezdV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NamerenyCas = table.Column<TimeSpan>(type: "interval", nullable: true),
                    Kod = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vysledky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vysledky_Rozjizdky_RozjizdkaId",
                        column: x => x.RozjizdkaId,
                        principalTable: "Rozjizdky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Vysledky_Ucasti_UcastId",
                        column: x => x.UcastId,
                        principalTable: "Ucasti",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Kategorie_SerieId_Nazev",
                table: "Kategorie",
                columns: new[] { "SerieId", "Nazev" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Lode_MajitelId",
                table: "Lode",
                column: "MajitelId");

            migrationBuilder.CreateIndex(
                name: "IX_Osoby_UserId",
                table: "Osoby",
                column: "UserId",
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Prihlasky_KategorieId",
                table: "Prihlasky",
                column: "KategorieId");

            migrationBuilder.CreateIndex(
                name: "IX_Prihlasky_LodId",
                table: "Prihlasky",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_Prihlasky_SerieId_LodId",
                table: "Prihlasky",
                columns: new[] { "SerieId", "LodId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rozjizdky_ZavodId_Cislo",
                table: "Rozjizdky",
                columns: new[] { "ZavodId", "Cislo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Serie_Slug",
                table: "Serie",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ucasti_KormidelnikId",
                table: "Ucasti",
                column: "KormidelnikId");

            migrationBuilder.CreateIndex(
                name: "IX_Ucasti_PrihlaskaId",
                table: "Ucasti",
                column: "PrihlaskaId");

            migrationBuilder.CreateIndex(
                name: "IX_Ucasti_ZavodId_PrihlaskaId",
                table: "Ucasti",
                columns: new[] { "ZavodId", "PrihlaskaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vysledky_RozjizdkaId_UcastId",
                table: "Vysledky",
                columns: new[] { "RozjizdkaId", "UcastId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vysledky_UcastId",
                table: "Vysledky",
                column: "UcastId");

            migrationBuilder.CreateIndex(
                name: "IX_Zavody_SerieId_Slug",
                table: "Zavody",
                columns: new[] { "SerieId", "Slug" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Vysledky");

            migrationBuilder.DropTable(
                name: "Rozjizdky");

            migrationBuilder.DropTable(
                name: "Ucasti");

            migrationBuilder.DropTable(
                name: "Prihlasky");

            migrationBuilder.DropTable(
                name: "Zavody");

            migrationBuilder.DropTable(
                name: "Kategorie");

            migrationBuilder.DropTable(
                name: "Lode");

            migrationBuilder.DropTable(
                name: "Serie");

            migrationBuilder.DropTable(
                name: "Osoby");

            migrationBuilder.CreateTable(
                name: "Metrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Description = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true),
                    Path = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Unit = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Metrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Quarantine",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MetricPath = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SourceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ValidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Value = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quarantine", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Measurements",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MetricId = table.Column<int>(type: "integer", nullable: false),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Quality = table.Column<int>(type: "integer", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SourceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ValidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Value = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Measurements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Measurements_Metrics_MetricId",
                        column: x => x.MetricId,
                        principalTable: "Metrics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_MetricId",
                table: "Measurements",
                column: "MetricId");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_EventId",
                table: "Measurements",
                columns: new[] { "SourceId", "EventId" },
                unique: true,
                filter: "\"EventId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_MetricId_ValidAt",
                table: "Measurements",
                columns: new[] { "SourceId", "MetricId", "ValidAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_MetricId_ValidAt_IssuedAt",
                table: "Measurements",
                columns: new[] { "SourceId", "MetricId", "ValidAt", "IssuedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Metrics_Path",
                table: "Metrics",
                column: "Path",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quarantine_MetricPath_ReceivedAt",
                table: "Quarantine",
                columns: new[] { "MetricPath", "ReceivedAt" });
        }
    }
}
