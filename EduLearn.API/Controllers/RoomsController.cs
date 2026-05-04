using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduLearn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoomsController : ControllerBase
{
    private readonly IRoomRepository _roomRepo;

    public RoomsController(IRoomRepository roomRepo)
    {
        _roomRepo = roomRepo;
    }

    // POST /api/rooms
    /// <summary>
    /// Create a new room. DeptAdmin and ITAdmin only.
    /// Returns 409 Conflict if the building and room number combination already exists.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "DeptAdminPolicy")]
    public async Task<ActionResult<RoomResponseDto>> CreateRoom(
        CreateRoomDto dto, CancellationToken cancellationToken)
    {
        // Same building + room number combination must be unique
        var existing = await _roomRepo.GetByBuildingAndNumberAsync(dto.Building, dto.RoomNumber);
        if (existing is not null)
            return Conflict(new
            {
                error = "A room with this building and room number already exists",
                code = "DUPLICATE_ROOM"
            });

        var room = new Room
        {
            Building = dto.Building,
            RoomNumber = dto.RoomNumber,
            Capacity = dto.Capacity,
            ResourcesJSON = dto.ResourcesJSON
        };

        var created = await _roomRepo.CreateAsync(room);
        return CreatedAtAction(nameof(GetRoom),
            new { id = created.RoomID }, MapToDto(created));
    }

    // GET /api/rooms
    /// <summary>
    /// List all rooms. All authenticated roles.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoomResponseDto>>> GetRooms(
        CancellationToken cancellationToken)
    {
        var rooms = await _roomRepo.GetAllAsync();
        return Ok(rooms.Select(MapToDto));
    }

    // GET /api/rooms/{id}
    /// <summary>
    /// Retrieve a single room by ID. All authenticated roles.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<RoomResponseDto>> GetRoom(
        int id, CancellationToken cancellationToken)
    {
        var room = await _roomRepo.GetByIdAsync(id);

        if (room is null)
            return NotFound(new
            {
                error = "Room not found",
                code = "ROOM_NOT_FOUND"
            });

        return Ok(MapToDto(room));
    }

    private static RoomResponseDto MapToDto(Room r) => new()
    {
        RoomID = r.RoomID,
        Building = r.Building,
        RoomNumber = r.RoomNumber,
        Capacity = r.Capacity,
        ResourcesJSON = r.ResourcesJSON,
        Status = r.Status
    };
}
