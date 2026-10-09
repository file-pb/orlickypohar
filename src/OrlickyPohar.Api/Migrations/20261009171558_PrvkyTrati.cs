using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PrvkyTrati : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrvkyTrati",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TratId = table.Column<int>(type: "integer", nullable: false),
                    Typ = table.Column<int>(type: "integer", nullable: false),
                    Poradi = table.Column<int>(type: "integer", nullable: false),
                    Strana = table.Column<int>(type: "integer", nullable: true),
                    BojeAId = table.Column<int>(type: "integer", nullable: false),
                    BojeBId = table.Column<int>(type: "integer", nullable: true),
                    KonecBSirka = table.Column<double>(type: "double precision", nullable: true),
                    KonecBDelka = table.Column<double>(type: "double precision", nullable: true),
                    KonecBPopis = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrvkyTrati", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrvkyTrati_Boje_BojeAId",
                        column: x => x.BojeAId,
                        principalTable: "Boje",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrvkyTrati_Boje_BojeBId",
                        column: x => x.BojeBId,
                        principalTable: "Boje",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PrvkyTrati_Trate_TratId",
                        column: x => x.TratId,
                        principalTable: "Trate",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrvkyTrati_BojeAId",
                table: "PrvkyTrati",
                column: "BojeAId");

            migrationBuilder.CreateIndex(
                name: "IX_PrvkyTrati_BojeBId",
                table: "PrvkyTrati",
                column: "BojeBId");

            migrationBuilder.CreateIndex(
                name: "IX_PrvkyTrati_TratId_Poradi",
                table: "PrvkyTrati",
                columns: new[] { "TratId", "Poradi" });

            // Převod toho, co už je: z každé **stojící** bóje se stane
            // jednobójová značka (typ 0) s pořadím z bóje a bez strany —
            // tu z názvu domyslet nejde a `null` musí znamenat „neuvedeno".
            //
            // Nahrazené a sebrané bóje prvek nedostanou. Nepatřily k žádné
            // přijaté trati, protože přijetí dodnes neexistovalo; vyrábět
            // jim prvek by bylo tvrzení, které se nedá doložit.
            //
            // Jen nejnovější trať regaty. Dnes má každá právě jednu, ale
            // kdyby jich mezitím přibylo, starší se bóje dopočítat nemají.
            migrationBuilder.Sql(
                """
                INSERT INTO "PrvkyTrati" ("TratId", "Typ", "Poradi", "BojeAId")
                SELECT t."Id", 0, b."Poradi", b."Id"
                FROM "Trate" t
                JOIN "Boje" b ON b."ZavodId" = t."ZavodId"
                WHERE b."NahrazenaV" IS NULL
                  AND b."SebranaV" IS NULL
                  AND t."Id" = (SELECT MAX(t2."Id") FROM "Trate" t2 WHERE t2."ZavodId" = t."ZavodId");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PrvkyTrati");
        }
    }
}
