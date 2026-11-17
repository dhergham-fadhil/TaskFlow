using System.Linq;
using System.Text.Json;
using TaskFlow.Models;
using TaskFlow.Services;

namespace TaskFlow.Api.Tests;

/// <summary>
/// Guards the contract in MappingExtensions: SQL datetime2 round-trips as
/// DateTimeKind.Unspecified, so mapping must mark stored timestamps as UTC
/// (serialized with a trailing "Z") while leaving calendar due dates alone.
/// </summary>
public class MappingExtensionsTests
{
    private static readonly DateTime Unspecified =
        new(2026, 11, 16, 23, 56, 28, DateTimeKind.Unspecified);

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Fact]
    public void StoredTimestamps_AreMarkedUtc_WithoutShiftingTheInstant()
    {
        var task = new ProjectTask { Id = 2, CreatedAt = Unspecified, UpdatedAt = Unspecified };
        task.Comments.Add(new Comment { Id = 3, Body = "note", AuthorId = 1, CreatedAt = Unspecified });
        var project = new Project { Id = 1, CreatedAt = Unspecified };
        project.Tasks.Add(task);
        var activity = new Activity { Action = "created", Target = "Spec", CreatedAt = Unspecified };

        var projectDto = project.ToDto();
        var taskDto = projectDto.Tasks.Single();
        var commentDto = taskDto.Comments.Single();
        var activityDto = activity.ToDto();

        Assert.Equal(DateTimeKind.Utc, projectDto.CreatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, taskDto.CreatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, taskDto.UpdatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, commentDto.CreatedAt.Kind);
        Assert.Equal(DateTimeKind.Utc, activityDto.CreatedAt.Kind);

        // Same wall-clock value, relabelled — never shifted by an offset.
        Assert.Equal(Unspecified.Ticks, taskDto.CreatedAt.Ticks);
    }

    [Fact]
    public void AlreadyUtcTimestamps_AreNotConvertedTwice()
    {
        var utc = new DateTime(2026, 11, 16, 23, 56, 28, DateTimeKind.Utc);
        var dto = new ProjectTask { Id = 1, CreatedAt = utc, UpdatedAt = utc }.ToDto();

        Assert.Equal(DateTimeKind.Utc, dto.CreatedAt.Kind);
        Assert.Equal(utc, dto.CreatedAt);
        Assert.Equal(utc.Ticks, dto.UpdatedAt.Ticks);
    }

    [Fact]
    public void SerializedTimestamps_CarryTheUtcDesignator()
    {
        var dto = new Activity { Action = "created", Target = "Spec", CreatedAt = Unspecified }.ToDto();

        var json = JsonSerializer.Serialize(dto, Json);

        Assert.Contains("\"createdAt\":\"2026-11-16T23:56:28Z\"", json);
    }

    [Fact]
    public void DueDates_RemainCalendarDates_WithNoTimezoneDesignator()
    {
        var due = new DateTime(2026, 12, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var withDueDate = new ProjectTask
        {
            Id = 1,
            CreatedAt = Unspecified,
            UpdatedAt = Unspecified,
            DueDate = due
        }.ToDto();
        var withoutDueDate = new ProjectTask
        {
            Id = 2,
            CreatedAt = Unspecified,
            UpdatedAt = Unspecified,
            DueDate = null
        }.ToDto();

        Assert.NotNull(withDueDate.DueDate);
        Assert.Equal(DateTimeKind.Unspecified, withDueDate.DueDate!.Value.Kind);
        Assert.Equal(due, withDueDate.DueDate.Value);
        Assert.Null(withoutDueDate.DueDate);

        var json = JsonSerializer.Serialize(withDueDate, Json);
        Assert.Contains("\"dueDate\":\"2026-12-01T00:00:00\"", json);
    }
}
