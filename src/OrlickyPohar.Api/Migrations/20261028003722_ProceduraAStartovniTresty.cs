using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ProceduraAStartovniTresty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // <b>Pět, ne nula.</b> EF dosadí do `defaultValue` nulu, protože
            // inicializátor vlastnosti v C# platí jen pro nové entity —
            // jenže nulová procedura by u všech odjetých i plánovaných
            // regat znamenala, že odpočet na tabuli nemá co odpočítávat
            // a že uložení délky neprojde kontrolou. Pětka je výchozí
            // délka podle ZPJ 26 (`Procedura.DelkaVychozi`).
            migrationBuilder.AddColumn<int>(
                name: "DelkaProceduryMin",
                table: "Zavody",
                type: "integer",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<int>(
                name: "OpakovanychStartu",
                table: "Rozjizdky",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DelkaProceduryMin",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "OpakovanychStartu",
                table: "Rozjizdky");
        }
    }
}
