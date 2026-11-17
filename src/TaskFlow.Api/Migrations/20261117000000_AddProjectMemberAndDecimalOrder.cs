using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TaskFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectMemberAndDecimalOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tasks_ProjectId_Status_Order",
                table: "Tasks");

            migrationBuilder.AlterColumn<decimal>(
                name: "Order",
                table: "Tasks",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateTable(
                name: "ProjectMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectMembers_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectMembers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectMembers_ProjectId_UserId",
                table: "ProjectMembers",
                columns: new[] { "ProjectId", "UserId" },
                unique: true);

            // Migrate existing denormalized MemberIds JSON into the relational ProjectMembers table.
            // MemberIds is stored as a JSON array of ints, e.g. "[1,2,3]".
            migrationBuilder.Sql(@"
                INSERT INTO ProjectMembers (ProjectId, UserId, JoinedAt)
                SELECT p.Id, CAST(value AS int), SYSDATETIME()
                FROM Projects p
                CROSS APPLY OPENJSON(p.MemberIds);
            ");

            migrationBuilder.DropColumn(
                name: "MemberIds",
                table: "Projects");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ProjectId_Status_Order",
                table: "Tasks",
                columns: new[] { "ProjectId", "Status", "Order" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tasks_ProjectId_Status_Order",
                table: "Tasks");

            migrationBuilder.AddColumn<string>(
                name: "MemberIds",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.DropTable(
                name: "ProjectMembers");

            migrationBuilder.AlterColumn<int>(
                name: "Order",
                table: "Tasks",
                type: "int",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ProjectId_Status_Order",
                table: "Tasks",
                columns: new[] { "ProjectId", "Status", "Order" },
                unique: true);
        }
    }
}