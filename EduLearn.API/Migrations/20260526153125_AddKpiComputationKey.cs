using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddKpiComputationKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ComputationKey",
                table: "KPIs",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE KPIs SET ComputationKey = 1 WHERE Name = 'Active Student Count';
                UPDATE KPIs SET ComputationKey = 2 WHERE Name = 'Section Fill Rate';
                UPDATE KPIs SET ComputationKey = 3 WHERE Name = 'Invoice Collection Rate';
                UPDATE KPIs SET ComputationKey = 4 WHERE Name = 'Assessment Completion Rate';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ComputationKey",
                table: "KPIs");
        }
    }
}
