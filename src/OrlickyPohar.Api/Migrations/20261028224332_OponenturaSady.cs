using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class OponenturaSady : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Sady",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Nazev = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Uvod = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Poradi = table.Column<int>(type: "integer", nullable: false),
                    VytvorenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sady", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sady_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Otazky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SadaId = table.Column<int>(type: "integer", nullable: false),
                    Kod = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Poradi = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Vysvetleni = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Uvolni = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    VolbyVice = table.Column<bool>(type: "boolean", nullable: false),
                    Volby = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Otazky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Otazky_Sady_SadaId",
                        column: x => x.SadaId,
                        principalTable: "Sady",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VyplneniSad",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SadaId = table.Column<int>(type: "integer", nullable: false),
                    KdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    DokonceneV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VyplneniSad", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VyplneniSad_Sady_SadaId",
                        column: x => x.SadaId,
                        principalTable: "Sady",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VyplneniSad_Uzivatele_KdoId",
                        column: x => x.KdoId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HlasoveOdpovedi",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OtazkaId = table.Column<int>(type: "integer", nullable: false),
                    KdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Typ = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Velikost = table.Column<long>(type: "bigint", nullable: false),
                    Sekund = table.Column<int>(type: "integer", nullable: true),
                    NahranoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HlasoveOdpovedi", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HlasoveOdpovedi_Otazky_OtazkaId",
                        column: x => x.OtazkaId,
                        principalTable: "Otazky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HlasoveOdpovedi_Uzivatele_KdoId",
                        column: x => x.KdoId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OponenturaOdpovedi",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OtazkaId = table.Column<int>(type: "integer", nullable: false),
                    KdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Volby = table.Column<List<string>>(type: "text[]", nullable: false),
                    Text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    VytvorenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ZmenenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OponenturaOdpovedi", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OponenturaOdpovedi_Otazky_OtazkaId",
                        column: x => x.OtazkaId,
                        principalTable: "Otazky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OponenturaOdpovedi_Uzivatele_KdoId",
                        column: x => x.KdoId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HlasoveOdpovedi_KdoId",
                table: "HlasoveOdpovedi",
                column: "KdoId");

            migrationBuilder.CreateIndex(
                name: "IX_HlasoveOdpovedi_OtazkaId",
                table: "HlasoveOdpovedi",
                column: "OtazkaId");

            migrationBuilder.CreateIndex(
                name: "IX_OponenturaOdpovedi_KdoId",
                table: "OponenturaOdpovedi",
                column: "KdoId");

            migrationBuilder.CreateIndex(
                name: "IX_OponenturaOdpovedi_OtazkaId_KdoId",
                table: "OponenturaOdpovedi",
                columns: new[] { "OtazkaId", "KdoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Otazky_SadaId_Kod",
                table: "Otazky",
                columns: new[] { "SadaId", "Kod" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sady_SerieId_Slug",
                table: "Sady",
                columns: new[] { "SerieId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VyplneniSad_KdoId",
                table: "VyplneniSad",
                column: "KdoId");

            migrationBuilder.CreateIndex(
                name: "IX_VyplneniSad_SadaId_KdoId",
                table: "VyplneniSad",
                columns: new[] { "SadaId", "KdoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HlasoveOdpovedi");

            migrationBuilder.DropTable(
                name: "OponenturaOdpovedi");

            migrationBuilder.DropTable(
                name: "VyplneniSad");

            migrationBuilder.DropTable(
                name: "Otazky");

            migrationBuilder.DropTable(
                name: "Sady");
        }
    }
}
