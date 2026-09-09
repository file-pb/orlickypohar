using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Identita : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Uzivatele",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Zobrazovane = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    ZalozenV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NaposledyPrihlasenV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Uzivatele", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Opravneni",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    SerieId = table.Column<int>(type: "integer", nullable: false),
                    ZavodId = table.Column<int>(type: "integer", nullable: true),
                    UdelenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Opravneni", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Opravneni_Serie_SerieId",
                        column: x => x.SerieId,
                        principalTable: "Serie",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Opravneni_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Opravneni_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Vazby",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Issuer = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    ZalozenV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vazby", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vazby_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Opravneni_SerieId",
                table: "Opravneni",
                column: "SerieId");

            migrationBuilder.CreateIndex(
                name: "IX_Opravneni_UzivatelId_Role_SerieId_ZavodId",
                table: "Opravneni",
                columns: new[] { "UzivatelId", "Role", "SerieId", "ZavodId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Opravneni_ZavodId",
                table: "Opravneni",
                column: "ZavodId");

            migrationBuilder.CreateIndex(
                name: "IX_Vazby_Issuer_Subject",
                table: "Vazby",
                columns: new[] { "Issuer", "Subject" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vazby_UzivatelId",
                table: "Vazby",
                column: "UzivatelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Opravneni");

            migrationBuilder.DropTable(
                name: "Vazby");

            migrationBuilder.DropTable(
                name: "Uzivatele");
        }
    }
}
