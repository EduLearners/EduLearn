// ============================================================
// SRA-03: TranscriptPdfDocument.cs
// QuestPDF document definition for official transcript PDF output.
// Install: dotnet add package QuestPDF
// License: QuestPDF.Settings.License = LicenseType.Community (set in Program.cs)
// ============================================================

using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduLearn.API.Services;

// ── Data model passed into the PDF generator ──────────────────
public class TranscriptPdfData
{
    public string StudentName { get; set; } = string.Empty;
    public string MRN { get; set; } = string.Empty;
    public string ProgramName { get; set; } = string.Empty;
    public decimal? GPA { get; set; }
    public DateTime? IssuedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<TranscriptEntryRow> Entries { get; set; } = new();
    public int TotalCredits => Entries.Sum(e => e.Credits);
}

public class TranscriptEntryRow
{
    public string CourseCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public int Credits { get; set; }
    public string Term { get; set; } = string.Empty;
    public bool GradePosted { get; set; }

    // BUG-4 FIX: Preserve full enrollment data stored in EntriesJSON so it is not
    // silently dropped during deserialization. Currently informational only; the PDF
    // layout doesn't render these fields yet, but downstream consumers (audit, replay,
    // future PDF revisions) now have access to them.
    public string? Status { get; set; }
    public DateTime? EnrolledAt { get; set; }
}

// ── QuestPDF document class ────────────────────────────────────
public class TranscriptPdfDocument : IDocument
{
    private readonly TranscriptPdfData _data;

    // Brand colours
    private static readonly string PrimaryColor = "#1a3c6e";   // dark navy
    private static readonly string AccentColor  = "#f0f4fa";   // light blue-grey background
    private static readonly string MutedColor   = "#6b7280";   // grey text

    public TranscriptPdfDocument(TranscriptPdfData data) => _data = data;

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    // BUG-5 FIX: Single source of truth for page layout. Previously this method had a
    // duplicate copy of the same page setup that already lives in Compose(); editing one
    // and forgetting the other was a real risk. Now ToPdfBytes() just delegates to
    // Document.Create(Compose) which invokes IDocument.Compose on this instance.
    public byte[] ToPdfBytes()
    {
        using var stream = new System.IO.MemoryStream();
        Document.Create(Compose).GeneratePdf(stream);
        return stream.ToArray();
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(40);
            page.DefaultTextStyle(t => t.FontSize(10).FontFamily(Fonts.Arial));

            page.Header().Element(ComposeHeader);
            page.Content().PaddingTop(16).Element(ComposeContent);
            page.Footer().AlignCenter().Text(x =>
            {
                x.Span("EduLearn University  |  Page ").FontSize(9).FontColor(MutedColor);
                x.CurrentPageNumber().FontSize(9).FontColor(MutedColor);
                x.Span(" of ").FontSize(9).FontColor(MutedColor);
                x.TotalPages().FontSize(9).FontColor(MutedColor);
            });
        });
    }

    // ── Header: University logo area + title ────────────────────
    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            // Top bar
            col.Item().Background(PrimaryColor).Padding(14).Row(row =>
            {
                row.RelativeItem().Column(inner =>
                {
                    inner.Item().Text("EduLearn University")
                        .FontSize(20).Bold().FontColor(Colors.White);
                    inner.Item().Text("Official Academic Transcript")
                        .FontSize(11).FontColor("#b8cce4");
                });
                row.ConstantItem(120).AlignRight().AlignMiddle()
                    .Text("OFFICIAL COPY")
                    .FontSize(9).Bold().FontColor("#b8cce4");
            });

            // Divider line
            col.Item().Height(3).Background("#e2a94b");  // gold accent line
        });
    }

    // ── Content: student info card + course table + totals ──────
    private void ComposeContent(IContainer container)
    {
        container.Column(col =>
        {
            // ── Student info card ─────────────────────────────────
            col.Item().Background(AccentColor).Border(1).BorderColor("#d1d5db")
                .Padding(14).Row(row =>
                {
                    // Left side
                    row.RelativeItem().Column(left =>
                    {
                        left.Item().Text(txt =>
                        {
                            txt.Span("Student Name: ").Bold();
                            txt.Span(_data.StudentName);
                        });
                        left.Item().PaddingTop(4).Text(txt =>
                        {
                            txt.Span("MRN: ").Bold();
                            txt.Span(_data.MRN);
                        });
                        left.Item().PaddingTop(4).Text(txt =>
                        {
                            txt.Span("Program: ").Bold();
                            txt.Span(_data.ProgramName);
                        });
                    });

                    // Right side
                    row.RelativeItem().Column(right =>
                    {
                        right.Item().Text(txt =>
                        {
                            txt.Span("CGPA: ").Bold();
                            txt.Span(_data.GPA.HasValue
                                ? $"{_data.GPA:0.00} / 10.00"
                                : "Not yet computed");
                        });
                        right.Item().PaddingTop(4).Text(txt =>
                        {
                            txt.Span("Status: ").Bold();
                            txt.Span(_data.Status);
                        });
                        right.Item().PaddingTop(4).Text(txt =>
                        {
                            txt.Span("Issued: ").Bold();
                            txt.Span(_data.IssuedAt.HasValue
                                ? _data.IssuedAt.Value.ToString("dd MMM yyyy")
                                : "—");
                        });
                    });
                });

            col.Item().PaddingTop(16);

            // ── Section header ────────────────────────────────────
            col.Item().Background(PrimaryColor).Padding(8)
                .Text("Academic Record")
                .FontSize(11).Bold().FontColor(Colors.White);

            // ── Course table ──────────────────────────────────────
            col.Item().Border(1).BorderColor("#d1d5db").Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(80);   // Course Code
                    cols.RelativeColumn(3);    // Course Name
                    cols.ConstantColumn(55);   // Credits
                    cols.ConstantColumn(80);   // Term
                    cols.ConstantColumn(75);   // Grade Status
                });

                // Table header row
                table.Header(header =>
                {
                    void HeaderCell(string text) =>
                        header.Cell().Background(PrimaryColor).Padding(6)
                            .Text(text).Bold().FontColor(Colors.White).FontSize(9);

                    HeaderCell("Code");
                    HeaderCell("Course Title");
                    HeaderCell("Credits");
                    HeaderCell("Term");
                    HeaderCell("Grade");
                });

                // Data rows — alternating background
                for (int i = 0; i < _data.Entries.Count; i++)
                {
                    var entry = _data.Entries[i];
                    var bg = i % 2 == 0 ? Colors.White.ToString() : AccentColor;

                    void DataCell(string text, bool centred = false)
                    {
                        var cell = table.Cell().Background(bg).Padding(6);
                        if (centred)
                            cell.AlignCenter().Text(text).FontSize(9);
                        else
                            cell.Text(text).FontSize(9);
                    }

                    DataCell(entry.CourseCode);
                    DataCell(entry.CourseName);
                    DataCell(entry.Credits.ToString(), centred: true);
                    DataCell(entry.Term, centred: true);
                    DataCell(entry.GradePosted ? "Posted" : "Pending", centred: true);
                }

                // Empty state
                if (_data.Entries.Count == 0)
                {
                    table.Cell().ColumnSpan(5).Padding(16)
                        .AlignCenter()
                        .Text("No enrolled courses on record.")
                        .FontColor(MutedColor).Italic();
                }
            });

            // ── Totals row ────────────────────────────────────────
            col.Item().Background(AccentColor).Border(1).BorderColor("#d1d5db")
                .BorderTop(0).Padding(8).Row(row =>
                {
                    row.RelativeItem().Text(txt =>
                    {
                        txt.Span("Total Credits Earned: ").Bold();
                        txt.Span(_data.TotalCredits.ToString());
                    });
                    row.RelativeItem().AlignRight().Text(txt =>
                    {
                        txt.Span("Total Courses: ").Bold();
                        txt.Span(_data.Entries.Count.ToString());
                    });
                });

            col.Item().PaddingTop(24);

            // ── Official seal / signature line ───────────────────
            col.Item().Row(row =>
            {
                row.RelativeItem(); // spacer
                row.ConstantItem(200).Column(sig =>
                {
                    sig.Item().BorderBottom(1).BorderColor(PrimaryColor).Height(30);
                    sig.Item().PaddingTop(4).AlignCenter()
                        .Text("Registrar's Signature").FontSize(9).FontColor(MutedColor);
                });
            });

            col.Item().PaddingTop(16);

            // ── Disclaimer ────────────────────────────────────────
            col.Item().Background("#fff8e1").Border(1).BorderColor("#f6d860")
                .Padding(8)
                .Text("This is an official transcript issued by EduLearn University. " +
                      "Any alteration renders this document invalid. " +
                      "Issued electronically — no physical seal required.")
                .FontSize(8).FontColor("#7a6500").Italic();
        });
    }
}
