using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Pomocnici : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Pomocnici",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    OdV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ZaskrtlId = table.Column<Guid>(type: "uuid", nullable: false),
                    OdskrtlId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pomocnici", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pomocnici_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pomocnici_ZavodId_UzivatelId_DoV",
                table: "Pomocnici",
                columns: new[] { "ZavodId", "UzivatelId", "DoV" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Pomocnici");
        }
    }
}
