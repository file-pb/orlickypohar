using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StazeniSmernice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuvodStazeni",
                table: "Smernice",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StahlId",
                table: "Smernice",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StazenoV",
                table: "Smernice",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Smernice_StahlId",
                table: "Smernice",
                column: "StahlId");

            migrationBuilder.AddForeignKey(
                name: "FK_Smernice_Uzivatele_StahlId",
                table: "Smernice",
                column: "StahlId",
                principalTable: "Uzivatele",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Smernice_Uzivatele_StahlId",
                table: "Smernice");

            migrationBuilder.DropIndex(
                name: "IX_Smernice_StahlId",
                table: "Smernice");

            migrationBuilder.DropColumn(
                name: "DuvodStazeni",
                table: "Smernice");

            migrationBuilder.DropColumn(
                name: "StahlId",
                table: "Smernice");

            migrationBuilder.DropColumn(
                name: "StazenoV",
                table: "Smernice");
        }
    }
}
