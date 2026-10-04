using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class NarokyNaLod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Naroky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Poznamka = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PodanV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RozhodnutoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RozhodlId = table.Column<Guid>(type: "uuid", nullable: true),
                    Prijat = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Naroky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Naroky_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Naroky_Uzivatele_RozhodlId",
                        column: x => x.RozhodlId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Naroky_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Naroky_LodId_RozhodnutoV",
                table: "Naroky",
                columns: new[] { "LodId", "RozhodnutoV" });

            migrationBuilder.CreateIndex(
                name: "IX_Naroky_RozhodlId",
                table: "Naroky",
                column: "RozhodlId");

            migrationBuilder.CreateIndex(
                name: "IX_Naroky_UzivatelId",
                table: "Naroky",
                column: "UzivatelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Naroky");
        }
    }
}
