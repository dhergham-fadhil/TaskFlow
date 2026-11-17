using TaskFlow.Models;

namespace TaskFlow.Services;

/// <summary>
/// Metadata for frontend UI rendering (labels, colours, badge styles).
/// Separated from the constants in AppEnums so the two concerns never bleed
/// into each other. The frontend keeps its own copy in src/types/index.ts
/// for tree-shaking, but this class remains the server-side source of truth.
/// </summary>
public static class AppEnumsMetadata
{
    public static readonly RecordStatus Meta = new();

    public sealed class RecordStatus
    {
        public StatusMeta Task { get; } = new("backlog", "in_progress", "review", "done");
        public StatusMeta Project { get; } = new("active", "paused", "completed", "done");
        public PriorityMeta Priority { get; } = new("low", "medium", "high", "urgent");
        public IconMeta Icon { get; } = new("rocket", "palette", "code", "chart", "phone", "book");
    }

    public sealed class StatusMeta
    {
        public StatusMeta(string backlog, string inProgress, string review, string done)
        {
            Backlog = backlog;
            InProgress = inProgress;
            Review = review;
            Done = done;
        }

        public string Backlog { get; }
        public string InProgress { get; }
        public string Review { get; }
        public string Done { get; }
    }

    public sealed class PriorityMeta
    {
        public PriorityMeta(string low, string medium, string high, string urgent)
        {
            Low = low;
            Medium = medium;
            High = high;
            Urgent = urgent;
        }

        public string Low { get; }
        public string Medium { get; }
        public string High { get; }
        public string Urgent { get; }
    }

    public sealed class IconMeta
    {
        public IconMeta(string rocket, string palette, string code, string chart, string phone, string book)
        {
            Rocket = rocket;
            Palette = palette;
            Code = code;
            Chart = chart;
            Phone = phone;
            Book = book;
        }

        public string Rocket { get; }
        public string Palette { get; }
        public string Code { get; }
        public string Chart { get; }
        public string Phone { get; }
        public string Book { get; }
    }
}