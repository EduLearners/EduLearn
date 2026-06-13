// ============================================================
// SRA-03: TranscriptPdfDocument.cs
// QuestPDF document definition for official transcript PDF output.
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
    public string? Remark { get; set; }      // "PASS" | "XP" | null (Result Awaited)
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
    public decimal? Score { get; set; }
    public decimal? MaxScore { get; set; }
    public decimal? Percentage { get; set; }
    public string? LetterGrade { get; set; }
    public string? Status { get; set; }
    public DateTime? EnrolledAt { get; set; }
}

// ── QuestPDF document class ────────────────────────────────────
public class TranscriptPdfDocument : IDocument
{
    private readonly TranscriptPdfData _data;

    private static readonly string PrimaryColor = "#1a3c6e";
    private static readonly string AccentColor  = "#f0f4fa";
    private static readonly string MutedColor   = "#6b7280";

    public TranscriptPdfDocument(TranscriptPdfData data) => _data = data;

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    public DocumentSettings GetSettings() => DocumentSettings.Default;

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

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
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
            col.Item().Height(3).Background("#e2a94b");
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.Column(col =>
        {
            // ── Student info card ─────────────────────────────────
            col.Item().Background(AccentColor).Border(1).BorderColor("#d1d5db")
                .Padding(14).Row(row =>
                {
                    // Left — name, MRN, program
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

                    // Right — CGPA, Result, Status, Issued
                    row.RelativeItem().Column(right =>
                    {
                        // CGPA — shown only when Remark = PASS
                        right.Item().Text(txt =>
                        {
                            txt.Span("CGPA: ").Bold();
                            txt.Span(_data.GPA.HasValue
                                ? $"{_data.GPA:0.00} / 10.00"
                                : "—");
                        });

                        // Result — PASS / XP / Result Awaited
                        right.Item().PaddingTop(4).Text(txt =>
                        {
                            txt.Span("Result: ").Bold();
                            var remarkText = _data.Remark switch
                            {
                                "PASS" => "PASS",
                                "XP"   => "XP (Backlog Pending)",
                                _      => "Result Awaited"
                            };
                            txt.Span(remarkText);
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

            // ── XP warning note ───────────────────────────────────
            if (_data.Remark == "XP")
            {
                col.Item().Background("#fff3cd").Border(1).BorderColor("#ffc107")
                    .Padding(8).Text(
                        "⚠ This student has one or more failed courses (grade F). " +
                        "CGPA has been withheld until all backlogs are cleared.")
                    .FontSize(9).FontColor("#856404").Italic();
                col.Item().PaddingTop(8);
            }

            // ── Academic Record table ─────────────────────────────
            col.Item().Background(PrimaryColor).Padding(8)
                .Text("Academic Record")
                .FontSize(11).Bold().FontColor(Colors.White);

            col.Item().Border(1).BorderColor("#d1d5db").Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(80);
                    cols.RelativeColumn(3);
                    cols.ConstantColumn(55);
                    cols.ConstantColumn(80);
                    cols.ConstantColumn(75);
                });

                table.Header(header =>
                {
                    void H(string text) =>
                        header.Cell().Background(PrimaryColor).Padding(6)
                            .Text(text).Bold().FontColor(Colors.White).FontSize(9);
                    H("Code"); H("Course Title"); H("Credits"); H("Term"); H("Grade");
                });

                for (int i = 0; i < _data.Entries.Count; i++)
                {
                    var entry = _data.Entries[i];
                    var bg    = i % 2 == 0 ? Colors.White.ToString() : AccentColor;

                    void D(string text, bool centred = false)
                    {
                        var cell = table.Cell().Background(bg).Padding(6);
                        if (centred) cell.AlignCenter().Text(text).FontSize(9);
                        else cell.Text(text).FontSize(9);
                    }

                    D(entry.CourseCode);
                    D(entry.CourseName);
                    D(entry.Credits.ToString(), centred: true);
                    D(entry.Term, centred: true);

                    string gradeDisplay;
                    if (!string.IsNullOrWhiteSpace(entry.LetterGrade))
                        gradeDisplay = entry.LetterGrade;
                    else if (entry.Percentage.HasValue)
                        gradeDisplay = $"{entry.Percentage:0.0}%";
                    else if (entry.GradePosted)
                        gradeDisplay = "Graded";
                    else
                        gradeDisplay = "Pending";

                    D(gradeDisplay, centred: true);
                }

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

            // ── Signature line ────────────────────────────────────
            col.Item().Row(row =>
            {
                row.RelativeItem();
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
