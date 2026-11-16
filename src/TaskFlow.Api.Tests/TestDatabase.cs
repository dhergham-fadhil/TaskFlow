using TaskFlow.Data;
using Microsoft.EntityFrameworkCore;

namespace TaskFlow.Api.Tests;

public class TestDatabase : IDisposable
{
    public ApplicationDbContext CreateInMemoryContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new ApplicationDbContext(options);
    }

    public void Dispose()
    {
    }
}
