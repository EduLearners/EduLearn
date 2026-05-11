using EduLearn.API.Controllers;
using EduLearn.API.DTOs;
using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace EduLearn_Testing.Controller;

[TestFixture]
public class RoomsControllerTest
{
    // ── Mock dependency ──
    private Mock<IRoomRepository> _roomRepoMock;

    // ── Controller under test ──
    private RoomsController _controller;

    // ── Reusable test data ──
    private Room _testRoom;
    private CreateRoomDto _validCreateDto;

    [SetUp]
    public void Setup()
    {
        _roomRepoMock = new Mock<IRoomRepository>();
        _controller = new RoomsController(_roomRepoMock.Object);

        _testRoom = new Room
        {
            RoomID = 1,
            Building = "Engineering Block A",
            RoomNumber = "101",
            Capacity = 60,
            ResourcesJSON = "{\"projector\": true, \"whiteboard\": true}",
            Status = RoomStatus.Available
        };

        _validCreateDto = new CreateRoomDto
        {
            Building = "Engineering Block A",
            RoomNumber = "101",
            Capacity = 60,
            ResourcesJSON = "{\"projector\": true, \"whiteboard\": true}"
        };
    }

    // ════════════════════════════════════════════════════════════════
    // POST /api/rooms — CreateRoom
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task CreateRoom_ValidDto_Returns201()
    {
        // Arrange — no duplicate
        _roomRepoMock.Setup(r => r.GetByBuildingAndNumberAsync("Engineering Block A", "101"))
            .ReturnsAsync((Room?)null);
        _roomRepoMock.Setup(r => r.CreateAsync(It.IsAny<Room>()))
            .ReturnsAsync((Room r) => { r.RoomID = 1; return r; });

        // Act
        var result = await _controller.CreateRoom(_validCreateDto, CancellationToken.None);

        // Assert
        var created = result.Result as CreatedAtActionResult;
        Assert.That(created, Is.Not.Null);
        Assert.That(created!.StatusCode, Is.EqualTo(201));

        var response = created.Value as RoomResponseDto;
        Assert.That(response!.Building, Is.EqualTo("Engineering Block A"));
        Assert.That(response.RoomNumber, Is.EqualTo("101"));
        Assert.That(response.Capacity, Is.EqualTo(60));
        Assert.That(response.Status, Is.EqualTo(RoomStatus.Available));

        _roomRepoMock.Verify(r => r.CreateAsync(It.IsAny<Room>()), Times.Once);
    }

    [Test]
    public async Task CreateRoom_DuplicateBuildingAndNumber_Returns409()
    {
        // Arrange — same building + room number already exists
        _roomRepoMock.Setup(r => r.GetByBuildingAndNumberAsync("Engineering Block A", "101"))
            .ReturnsAsync(_testRoom);

        // Act
        var result = await _controller.CreateRoom(_validCreateDto, CancellationToken.None);

        // Assert
        var conflict = result.Result as ConflictObjectResult;
        Assert.That(conflict, Is.Not.Null);
        Assert.That(conflict!.StatusCode, Is.EqualTo(409));

        _roomRepoMock.Verify(r => r.CreateAsync(It.IsAny<Room>()), Times.Never);
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/rooms — GetRooms
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetRooms_ReturnsList()
    {
        // Arrange
        var rooms = new List<Room>
        {
            _testRoom,
            new Room
            {
                RoomID = 2, Building = "Science Block",
                RoomNumber = "201", Capacity = 40,
                Status = RoomStatus.Available
            }
        };
        _roomRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(rooms);

        // Act
        var result = await _controller.GetRooms(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var list = (ok!.Value as IEnumerable<RoomResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(2));
        Assert.That(list[0].Building, Is.EqualTo("Engineering Block A"));
        Assert.That(list[1].Building, Is.EqualTo("Science Block"));
    }

    [Test]
    public async Task GetRooms_Empty_ReturnsEmptyList()
    {
        // Arrange
        _roomRepoMock.Setup(r => r.GetAllAsync())
            .ReturnsAsync(new List<Room>());

        // Act
        var result = await _controller.GetRooms(CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        var list = (ok!.Value as IEnumerable<RoomResponseDto>)?.ToList();
        Assert.That(list!.Count, Is.EqualTo(0));
    }

    // ════════════════════════════════════════════════════════════════
    // GET /api/rooms/{id} — GetRoom
    // ════════════════════════════════════════════════════════════════

    [Test]
    public async Task GetRoom_Exists_Returns200()
    {
        // Arrange
        _roomRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(_testRoom);

        // Act
        var result = await _controller.GetRoom(1, CancellationToken.None);

        // Assert
        var ok = result.Result as OkObjectResult;
        Assert.That(ok, Is.Not.Null);

        var response = ok!.Value as RoomResponseDto;
        Assert.That(response!.RoomID, Is.EqualTo(1));
        Assert.That(response.Building, Is.EqualTo("Engineering Block A"));
        Assert.That(response.RoomNumber, Is.EqualTo("101"));
        Assert.That(response.ResourcesJSON, Does.Contain("projector"));
    }

    [Test]
    public async Task GetRoom_NotFound_Returns404()
    {
        // Arrange
        _roomRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Room?)null);

        // Act
        var result = await _controller.GetRoom(999, CancellationToken.None);

        // Assert
        var notFound = result.Result as NotFoundObjectResult;
        Assert.That(notFound, Is.Not.Null);
        Assert.That(notFound!.StatusCode, Is.EqualTo(404));
    }
}