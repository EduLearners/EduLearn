using EduLearn.API.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduLearn.API.Services;

public class PdfGeneratorService
{
    public PdfGeneratorService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ── Shared brand colours ──────────────────────────────────────
    private const string Primary = "#1a3c6e";
    private const string Accent  = "#f0f4fa";
    private const string Gold    = "#e2a94b";
    private const string Muted   = "#6b7280";

    // ── Helper: parse any JSON into key-value rows ────────────────
    private static List<(string Key, string Value)> ParseJsonRows(string? json)
    {
        var rows = new List<(string, string)>();
        if (string.IsNullOrWhiteSpace(json)) return rows;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Object)
            {
                foreach (var prop in doc.RootElement.EnumerateObject())
                {
                    var key = System.Text.RegularExpressions.Regex
                        .Replace(prop.Name, "(?<=[a-z])(?=[A-Z])", " ")
                        .Replace("_", " ");
                    key = char.ToUpper(key[0]) + key[1..];
                    rows.Add((key, prop.Value.ToString()));
                }
            }
            else if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                int i = 1;
                foreach (var item in doc.RootElement.EnumerateArray())
                    rows.Add(($"Item {i++}", item.ToString()));
            }
            else
            {
                rows.Add(("Value", json));
            }
        }
        catch
        {
            rows.Add(("Raw Data", json));
        }
        return rows;
    }

    // ── Shared page header builder ────────────────────────────────
    private static void BuildHeader(IContainer container, string subtitle, string badge)
    {
        container.Column(col =>
        {
            col.Item().Background(Primary).Padding(14).Row(row =>
            {
                row.RelativeItem().Column(inner =>
                {
                    inner.Item().Text("EduLearn University")
                        .FontSize(20).Bold().FontColor(Colors.White);
                    inner.Item().Text(subtitle)
                        .FontSize(11).FontColor("#b8cce4");
                });
                row.ConstantItem(120).AlignRight().AlignMiddle()
                    .Text(badge).FontSize(9).Bold().FontColor("#b8cce4");
            });
            col.Item().Height(3).Background(Gold);
        });
    }

    // ── Shared footer builder ─────────────────────────────────────
    private static void BuildFooter(IContainer container)
    {
        container.AlignCenter().Text(x =>
        {
            x.Span("EduLearn University  |  Confidential  |  Page ").FontSize(9).FontColor(Muted);
            x.CurrentPageNumber().FontSize(9).FontColor(Muted);
            x.Span(" of ").FontSize(9).FontColor(Muted);
            x.TotalPages().FontSize(9).FontColor(Muted);
        });
    }

    // ── Shared metrics/data table ─────────────────────────────────
    private static void BuildDataTable(
        ColumnDescriptor col,
        string sectionTitle,
        List<(string Key, string Value)> rows,
        string emptyMessage,
        string colHeader1 = "Metric",
        string colHeader2 = "Value")
    {
        col.Item().Background(Primary).Padding(8)
            .Text(sectionTitle).FontSize(11).Bold().FontColor(Colors.White);

        if (rows.Count > 0)
        {
            col.Item().Border(1).BorderColor("#d1d5db").Table(table =>
            {
                table.ColumnsDefinition(cols => { cols.RelativeColumn(2); cols.RelativeColumn(3); });
                table.Header(header =>
                {
                    header.Cell().Background(Primary).Padding(6)
                        .Text(colHeader1).Bold().FontColor(Colors.White).FontSize(9);
                    header.Cell().Background(Primary).Padding(6)
                        .Text(colHeader2).Bold().FontColor(Colors.White).FontSize(9);
                });
                for (int i = 0; i < rows.Count; i++)
                {
                    var bg = i % 2 == 0 ? Colors.White.ToString() : Accent;
                    table.Cell().Background(bg).Padding(6).Text(rows[i].Key).Bold().FontSize(9);
                    table.Cell().Background(bg).Padding(6).Text(rows[i].Value).FontSize(9);
                }
            });
        }
        else
        {
            col.Item().Border(1).BorderColor("#d1d5db").Padding(16).AlignCenter()
                .Text(emptyMessage).FontSize(10).FontColor(Muted).Italic();
        }
    }

    // Shared signature + disclaimer
    private static void BuildSignatureAndDisclaimer(ColumnDescriptor col, string disclaimerText)
    {
        col.Item().PaddingTop(24);
        col.Item().Row(row =>
        {
            row.RelativeItem();
            row.ConstantItem(200).Column(sig =>
            {
                sig.Item().BorderBottom(1).BorderColor(Primary).Height(30);
                sig.Item().PaddingTop(4).AlignCenter()
                    .Text("Authorised Signature").FontSize(9).FontColor(Muted);
            });
        });
        col.Item().PaddingTop(16);
        col.Item().Background("#fff8e1").Border(1).BorderColor("#f6d860").Padding(8)
            .Text(disclaimerText).FontSize(8).FontColor("#7a6500").Italic();
    }

    // ════════════════════════════════════════════════════════════════
    // GenerateReportPdf
    // ════════════════════════════════════════════════════════════════
    public byte[] GenerateReportPdf(ReportResponseDto report)
    {
        var metricRows = ParseJsonRows(report.MetricsJSON);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontSize(10).FontFamily(Fonts.Arial));

                page.Header().Element(c => BuildHeader(c, "Institutional Analytics Report", "CONFIDENTIAL"));

                page.Content().PaddingTop(16).Column(col =>
                {
                    col.Spacing(0);

                    // Meta card
                    col.Item().Background(Accent).Border(1).BorderColor("#d1d5db")
                        .Padding(14).Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text(t => { t.Span("Report ID: ").Bold(); t.Span(report.ReportID.ToString()); });
                                left.Item().PaddingTop(4).Text(t => { t.Span("Scope: ").Bold(); t.Span(report.Scope.ToString()); });
                                left.Item().PaddingTop(4).Text(t =>
                                {
                                    t.Span("Generated By: ").Bold();
                                    t.Span(!string.IsNullOrWhiteSpace(report.GeneratedByName)
                                        ? $"{report.GeneratedByName} (User ID {report.GeneratedByFK})"
                                        : $"User ID {report.GeneratedByFK}");
                                });
                            });
                            row.RelativeItem().Column(right =>
                            {
                                right.Item().Text(t => { t.Span("Generated At: ").Bold(); t.Span(report.GeneratedAt.ToString("dd MMM yyyy, HH:mm UTC")); });
                                right.Item().PaddingTop(4).Text(t =>
                                {
                                    t.Span("Parameters: ").Bold();
                                    t.Span(!string.IsNullOrWhiteSpace(report.ParametersJSON) ? report.ParametersJSON : "None");
                                });
                                right.Item().PaddingTop(4).Text(t =>
                                {
                                    t.Span("Report URI: ").Bold();
                                    t.Span(!string.IsNullOrWhiteSpace(report.ReportURI) ? report.ReportURI : "—");
                                });
                            });
                        });

                    col.Item().PaddingTop(16);

                    BuildDataTable(col, "Report Metrics", metricRows, "No metrics available for this report.");

                    BuildSignatureAndDisclaimer(col,
                        "This report is generated by EduLearn University systems and is confidential. " +
                        "Unauthorised distribution or alteration is prohibited. " +
                        "Generated electronically — no physical seal required.");
                });

                page.Footer().Element(BuildFooter);
            });
        }).GeneratePdf();
    }

    // ════════════════════════════════════════════════════════════════
    // GenerateAuditPackagePdf
    // ════════════════════════════════════════════════════════════════
    public byte[] GenerateAuditPackagePdf(AuditPackageResponseDto package)
    {
        var contentRows = ParseJsonRows(package.ContentsJSON);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(t => t.FontSize(10).FontFamily(Fonts.Arial));

                page.Header().Element(c => BuildHeader(c, "Accreditation Audit Package", "CONFIDENTIAL"));

                page.Content().PaddingTop(16).Column(col =>
                {
                    col.Spacing(0);

                    // Meta card
                    col.Item().Background(Accent).Border(1).BorderColor("#d1d5db")
                        .Padding(14).Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text(t => { t.Span("Package ID: ").Bold(); t.Span(package.PackageID.ToString()); });
                                left.Item().PaddingTop(4).Text(t => { t.Span("Period Start: ").Bold(); t.Span(package.PeriodStart.ToString("dd MMM yyyy")); });
                                left.Item().PaddingTop(4).Text(t => { t.Span("Period End: ").Bold(); t.Span(package.PeriodEnd.ToString("dd MMM yyyy")); });
                            });
                            row.RelativeItem().Column(right =>
                            {
                                right.Item().Text(t => { t.Span("Generated At: ").Bold(); t.Span(package.GeneratedAt.ToString("dd MMM yyyy, HH:mm UTC")); });
                                right.Item().PaddingTop(4).Text(t =>
                                {
                                    t.Span("Package URI: ").Bold();
                                    t.Span(!string.IsNullOrWhiteSpace(package.PackageURI) ? package.PackageURI : "—");
                                });
                            });
                        });

                    col.Item().PaddingTop(16);

                    BuildDataTable(col, "Included Reports", contentRows, "No contents available.", "Item", "Value");

                    BuildSignatureAndDisclaimer(col,
                        "This audit package is generated by EduLearn University systems and is confidential. " +
                        "Unauthorised distribution or alteration is prohibited. " +
                        "Generated electronically — no physical seal required.");
                });

                page.Footer().Element(BuildFooter);
            });
        }).GeneratePdf();
    }
}
