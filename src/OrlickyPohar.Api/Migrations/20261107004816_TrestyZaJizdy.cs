using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class TrestyZaJizdy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TrestyZaJizdy",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RozjizdkaId = table.Column<int>(type: "integer", nullable: false),
                    UcastId = table.Column<int>(type: "integer", nullable: false),
                    Druh = table.Column<int>(type: "integer", nullable: false),
                    UlozenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ZapsanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PosunCasu = table.Column<int>(type: "integer", nullable: false),
                    VykonanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UlozilId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrestyZaJizdy", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrestyZaJizdy_Rozjizdky_RozjizdkaId",
                        column: x => x.RozjizdkaId,
                        principalTable: "Rozjizdky",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrestyZaJizdy_Ucasti_UcastId",
                        column: x => x.UcastId,
                        principalTable: "Ucasti",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrestyZaJizdy_Uzivatele_UlozilId",
                        column: x => x.UlozilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrestyZaJizdy_RozjizdkaId_UlozenoV",
                table: "TrestyZaJizdy",
                columns: new[] { "RozjizdkaId", "UlozenoV" });

            migrationBuilder.CreateIndex(
                name: "IX_TrestyZaJizdy_UcastId",
                table: "TrestyZaJizdy",
                column: "UcastId");

            migrationBuilder.CreateIndex(
                name: "IX_TrestyZaJizdy_UlozilId",
                table: "TrestyZaJizdy",
                column: "UlozilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TrestyZaJizdy");
        }
    }
}
