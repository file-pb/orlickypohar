using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ObrazekOdZdroje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OdZdroje",
                table: "PrevzateClanky",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            // Co se ukazuje, to zdroj dal: `Obrazek` byl do téhle chvíle syrová
            // adresa z `og:image`, jen se mazala, když se nedala použít.
            // Přesazením se sběr nebude ptát na články, u kterých adresu známe —
            // doptá se jen na ty, které o ni přišly, a právě o ty tu jde.
            migrationBuilder.Sql(
                """UPDATE "PrevzateClanky" SET "OdZdroje" = "Obrazek" WHERE "Obrazek" IS NOT NULL;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OdZdroje",
                table: "PrevzateClanky");
        }
    }
}
