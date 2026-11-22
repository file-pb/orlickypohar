using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ZkracenaProtestniLhuta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuvodZkraceniLhuty",
                table: "Rozjizdky",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LhutuZkratilId",
                table: "Rozjizdky",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ProtestniLhutaDo",
                table: "Rozjizdky",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DuvodZkraceniLhuty",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "LhutuZkratilId",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "ProtestniLhutaDo",
                table: "Rozjizdky");
        }
    }
}
