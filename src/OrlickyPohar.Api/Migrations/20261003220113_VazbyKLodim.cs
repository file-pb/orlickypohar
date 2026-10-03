using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class VazbyKLodim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VazbyKLodim",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    Puvod = table.Column<int>(type: "integer", nullable: false),
                    VzniklaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PotvrdilId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VazbyKLodim", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VazbyKLodim_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VazbyKLodim_Uzivatele_PotvrdilId",
                        column: x => x.PotvrdilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VazbyKLodim_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VazbyKLodim_LodId_UzivatelId",
                table: "VazbyKLodim",
                columns: new[] { "LodId", "UzivatelId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VazbyKLodim_PotvrdilId",
                table: "VazbyKLodim",
                column: "PotvrdilId");

            migrationBuilder.CreateIndex(
                name: "IX_VazbyKLodim_UzivatelId",
                table: "VazbyKLodim",
                column: "UzivatelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VazbyKLodim");
        }
    }
}
