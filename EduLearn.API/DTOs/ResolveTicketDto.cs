using System.ComponentModel.DataAnnotations;

namespace EduLearn.API.DTOs;

public class ResolveTicketDto
{
    [MaxLength(500)]
    public string? ResolutionURI { get; set; }

    // Free-text resolution note. Not persisted on the Ticket entity; passed into the audit log
    // details only, so we avoid a schema migration during interim.
    [MaxLength(1000)]
    public string? ResolutionNote { get; set; }
}
