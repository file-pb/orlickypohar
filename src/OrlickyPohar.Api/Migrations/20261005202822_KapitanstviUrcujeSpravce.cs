using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class KapitanstviUrcujeSpravce : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RoleUrcenaV",
                table: "VazbyKLodim",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RoleUrcilId",
                table: "VazbyKLodim",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ZmenyRoli",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Predchozi = table.Column<int>(type: "integer", nullable: true),
                    Nova = table.Column<int>(type: "integer", nullable: true),
                    ZmenilId = table.Column<Guid>(type: "uuid", nullable: true),
                    ZmenenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZmenyRoli", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZmenyRoli_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ZmenyRoli_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ZmenyRoli_Uzivatele_ZmenilId",
                        column: x => x.ZmenilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VazbyKLodim_RoleUrcilId",
                table: "VazbyKLodim",
                column: "RoleUrcilId");

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyRoli_LodId",
                table: "ZmenyRoli",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyRoli_UzivatelId_LodId",
                table: "ZmenyRoli",
                columns: new[] { "UzivatelId", "LodId" });

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyRoli_ZmenilId",
                table: "ZmenyRoli",
                column: "ZmenilId");

            migrationBuilder.AddForeignKey(
                name: "FK_VazbyKLodim_Uzivatele_RoleUrcilId",
                table: "VazbyKLodim",
                column: "RoleUrcilId",
                principalTable: "Uzivatele",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VazbyKLodim_Uzivatele_RoleUrcilId",
                table: "VazbyKLodim");

            migrationBuilder.DropTable(
                name: "ZmenyRoli");

            migrationBuilder.DropIndex(
                name: "IX_VazbyKLodim_RoleUrcilId",
                table: "VazbyKLodim");

            migrationBuilder.DropColumn(
                name: "RoleUrcenaV",
                table: "VazbyKLodim");

            migrationBuilder.DropColumn(
                name: "RoleUrcilId",
                table: "VazbyKLodim");
        }
    }
}
