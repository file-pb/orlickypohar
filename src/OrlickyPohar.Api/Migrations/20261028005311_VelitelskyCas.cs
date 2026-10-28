using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class VelitelskyCas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "StartOdVelitele",
                table: "Rozjizdky",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Velitele",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ZavodId = table.Column<int>(type: "integer", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    OdV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PrevzalId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Velitele", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Velitele_Zavody_ZavodId",
                        column: x => x.ZavodId,
                        principalTable: "Zavody",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Velitele_ZavodId_DoV",
                table: "Velitele",
                columns: new[] { "ZavodId", "DoV" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Velitele");

            migrationBuilder.DropColumn(
                name: "StartOdVelitele",
                table: "Rozjizdky");
        }
    }
}
