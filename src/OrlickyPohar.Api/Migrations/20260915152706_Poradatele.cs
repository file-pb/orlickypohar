using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Poradatele : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PoradatelId",
                table: "Zavody",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Poradatele",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nazev = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Web = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Popis = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Telefon = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    KontaktniOsoba = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Adresa = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Sirka = table.Column<double>(type: "double precision", nullable: true),
                    Delka = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Poradatele", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Zavody_PoradatelId",
                table: "Zavody",
                column: "PoradatelId");

            migrationBuilder.CreateIndex(
                name: "IX_Poradatele_Slug",
                table: "Poradatele",
                column: "Slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Zavody_Poradatele_PoradatelId",
                table: "Zavody",
                column: "PoradatelId",
                principalTable: "Poradatele",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Dosavadní text se stane záznamem. Slug musí vyjít stejně jako
            // `Medailonek.Slug` (bez diakritiky, malá písmena, pomlčky, nejvýš
            // 80 znaků) — jinak by první uložení zastávky v kalendáři
            // nenašlo klub a založilo ho podruhé. `unaccent` na serveru být
            // nemusí, proto `translate` s českými znaky; exotičtější písmena
            // spadnou na pomlčku stejně jako v C#.
            const string slug = """
                rtrim(left(trim(both '-' from regexp_replace(
                    lower(translate(trim("Poradatel"),
                        'áäčďéěëíňóöôřšťúůüýžÁÄČĎÉĚËÍŇÓÖÔŘŠŤÚŮÜÝŽ',
                        'aacdeeeinooorstuuuyzAACDEEEINOOORSTUUUYZ')),
                    '[^a-z0-9]+', '-', 'g')), 80), '-')
                """;

            migrationBuilder.Sql($"""
                INSERT INTO "Poradatele" ("Slug", "Nazev")
                SELECT DISTINCT ON (slug) slug, nazev
                FROM (
                    SELECT {slug} AS slug, trim("Poradatel") AS nazev
                    FROM "Zavody"
                    WHERE "Poradatel" IS NOT NULL
                ) x
                WHERE slug <> ''
                ORDER BY slug, nazev;
                """);

            migrationBuilder.Sql($"""
                UPDATE "Zavody" SET
                    "PoradatelId" = p."Id",
                    "Poradatel" = p."Nazev"
                FROM "Poradatele" p
                WHERE "Zavody"."Poradatel" IS NOT NULL AND p."Slug" = {slug.Replace("\"Poradatel\"", "\"Zavody\".\"Poradatel\"")};
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Zavody_Poradatele_PoradatelId",
                table: "Zavody");

            migrationBuilder.DropTable(
                name: "Poradatele");

            migrationBuilder.DropIndex(
                name: "IX_Zavody_PoradatelId",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "PoradatelId",
                table: "Zavody");
        }
    }
}
