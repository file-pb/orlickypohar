using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class OknaRegat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OknoId",
                table: "Trasy",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Okna",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    Den = table.Column<int>(type: "integer", nullable: false),
                    OtevrenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OtevrelId = table.Column<Guid>(type: "uuid", nullable: false),
                    TvrdyKonec = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ZavrenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ZavrelId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Okna", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Okna_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_OknoId",
                table: "Trasy",
                column: "OknoId");

            migrationBuilder.CreateIndex(
                name: "IX_Okna_TvrdyKonec",
                table: "Okna",
                column: "TvrdyKonec");

            migrationBuilder.CreateIndex(
                name: "IX_Okna_ZavodId_OtevrenoV",
                table: "Okna",
                columns: new[] { "ZavodId", "OtevrenoV" });

            migrationBuilder.AddForeignKey(
                name: "FK_Trasy_Okna_OknoId",
                table: "Trasy",
                column: "OknoId",
                principalTable: "Okna",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trasy_Okna_OknoId",
                table: "Trasy");

            migrationBuilder.DropTable(
                name: "Okna");

            migrationBuilder.DropIndex(
                name: "IX_Trasy_OknoId",
                table: "Trasy");

            migrationBuilder.DropColumn(
                name: "OknoId",
                table: "Trasy");
        }
    }
}
