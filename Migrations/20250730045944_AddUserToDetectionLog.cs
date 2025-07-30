using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace iVA.Migrations
{
    /// <inheritdoc />
    public partial class AddUserToDetectionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "DetectionLogs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_DetectionLogs_UserId",
                table: "DetectionLogs",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_DetectionLogs_Users_UserId",
                table: "DetectionLogs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DetectionLogs_Users_UserId",
                table: "DetectionLogs");

            migrationBuilder.DropIndex(
                name: "IX_DetectionLogs_UserId",
                table: "DetectionLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "DetectionLogs");
        }
    }
}
