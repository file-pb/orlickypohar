using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StavyTrati : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Trate",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    RozjizdkaId = table.Column<int>(type: "integer", nullable: true),
                    Stav = table.Column<int>(type: "integer", nullable: false),
                    ZalozenaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NahrazujeId = table.Column<int>(type: "integer", nullable: true),
                    PrijatoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PrijalId = table.Column<Guid>(type: "uuid", nullable: true),
                    DuvodVraceni = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trate", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Trate_Rozjizdky_RozjizdkaId",
                        column: x => x.RozjizdkaId,
                        principalTable: "Rozjizdky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Trate_Trate_NahrazujeId",
                        column: x => x.NahrazujeId,
                        principalTable: "Trate",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Trate_Uzivatele_PrijalId",
                        column: x => x.PrijalId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Trate_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trate_NahrazujeId",
                table: "Trate",
                column: "NahrazujeId");

            migrationBuilder.CreateIndex(
                name: "IX_Trate_PrijalId",
                table: "Trate",
                column: "PrijalId");

            migrationBuilder.CreateIndex(
                name: "IX_Trate_RozjizdkaId",
                table: "Trate",
                column: "RozjizdkaId");

            migrationBuilder.CreateIndex(
                name: "IX_Trate_ZavodId_Stav",
                table: "Trate",
                columns: new[] { "ZavodId", "Stav" });

            // Regatám, které už bóje mají, se trať dopočítá — jedna na regatu.
            // Stav je `Rozestaveno` (0) schválně: přijetí dodnes neexistovalo,
            // takže nikdo nic nepotvrdil a vymýšlet za něj, že trať stojí, by
            // bylo totéž jako uhádnout stranu u převedené bóje.
            // `ZalozenaV` je čas prvního pípnutí, protože tehdy stavba začala.
            migrationBuilder.Sql(
                """
                INSERT INTO "Trate" ("ZavodId", "Stav", "ZalozenaV")
                SELECT b."ZavodId", 0, MIN(b."PostavenaV")
                FROM "Boje" b
                GROUP BY b."ZavodId";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Trate");
        }
    }
}
