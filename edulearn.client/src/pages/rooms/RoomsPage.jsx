import { useState, useEffect, useMemo } from 'react';
import { roomService } from '../../services/roomService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';

const emptyForm = {
    building: '',
    roomNumber: '',
    capacity: 30,
    projector: false,
    whiteboard: false,
    computers: 0,
    smartBoard: false,
};

export default function RoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    const { role } = authService.getCurrentUser();
    const canCreate = ['DeptAdmin', 'ITAdmin'].includes(role);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await roomService.getAll();
            setRooms(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRooms = useMemo(() => {
        if (!search.trim()) return rooms;
        const q = search.toLowerCase();
        return rooms.filter(r =>
            r.building?.toLowerCase().includes(q) ||
            r.roomNumber?.toLowerCase().includes(q)
        );
    }, [rooms, search]);

    const openCreateModal = () => {
        setForm(emptyForm);
        setFormError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setFormError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSaving(true);

        try {
            const resources = {
                projector: form.projector,
                whiteboard: form.whiteboard,
                computers: parseInt(form.computers, 10) || 0,
                smartBoard: form.smartBoard,
            };

            const payload = {
                building: form.building,
                roomNumber: form.roomNumber,
                capacity: parseInt(form.capacity, 10),
                resourcesJSON: JSON.stringify(resources),
            };

            await roomService.create(payload);
            setShowModal(false);
            await loadRooms();
        } catch (err) {
            setFormError(err);
        } finally {
            setSaving(false);
        }
    };

    // Parse resources JSON for display in the table
    const parseResources = (json) => {
        if (!json) return null;
        try { return JSON.parse(json); } catch { return null; }
    };

    return (
        <div>
            {/* Page header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-door-closed me-2"></i>Rooms
                </h2>
                {canCreate && (
                    <button className="btn btn-primary-edulearn" onClick={openCreateModal}>
                        <i className="bi bi-plus-lg me-2"></i>New Room
                    </button>
                )}
            </div>

            {/* Search bar */}
            <div className="card shadow-sm mb-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-10">
                            <label className="form-label fw-bold">
                                <i className="bi bi-search me-1"></i>Search
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by building or room number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={loadRooms}
                                disabled={loading}
                            >
                                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />

            {loading && <Loading message="Loading rooms..." />}

            {!loading && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        {filteredRooms.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-door-open" style={{ fontSize: '3rem' }}></i>
                                <p className="mt-3 mb-0">
                                    {rooms.length === 0
                                        ? 'No rooms in the system yet.'
                                        : 'No rooms match your search.'}
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="bg-primary-edulearn text-white">
                                        <tr>
                                            <th>Room ID</th>
                                            <th>Building</th>
                                            <th>Room Number</th>
                                            <th>Capacity</th>
                                            <th>Resources</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRooms.map(r => {
                                            const res = parseResources(r.resourcesJSON);
                                            return (
                                                <tr key={r.roomID}>
                                                    <td>#{r.roomID}</td>
                                                    <td className="fw-bold">{r.building}</td>
                                                    <td><code>{r.roomNumber}</code></td>
                                                    <td>
                                                        <i className="bi bi-people me-1 text-muted"></i>
                                                        {r.capacity}
                                                    </td>
                                                    <td>
                                                        {res ? (
                                                            <div className="d-flex gap-2 flex-wrap">
                                                                {res.projector && (
                                                                    <span className="badge bg-light text-dark" title="Projector">
                                                                        <i className="bi bi-projector"></i> Projector
                                                                    </span>
                                                                )}
                                                                {res.whiteboard && (
                                                                    <span className="badge bg-light text-dark" title="Whiteboard">
                                                                        <i className="bi bi-easel"></i> Whiteboard
                                                                    </span>
                                                                )}
                                                                {res.computers > 0 && (
                                                                    <span className="badge bg-light text-dark" title="Computers">
                                                                        <i className="bi bi-pc-display"></i> {res.computers} PCs
                                                                    </span>
                                                                )}
                                                                {res.smartBoard && (
                                                                    <span className="badge bg-light text-dark" title="Smart Board">
                                                                        <i className="bi bi-display"></i> Smart Board
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <StatusBadge status={r.status} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {filteredRooms.length > 0 && (
                        <div className="card-footer text-muted small">
                            Showing {filteredRooms.length} of {rooms.length} rooms
                        </div>
                    )}
                </div>
            )}

            {/* Create Room Modal */}
            {showModal && (
                <>
                    <div className="modal-backdrop fade show"></div>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary-edulearn text-white">
                                    <h5 className="modal-title">
                                        <i className="bi bi-door-closed me-2"></i>New Room
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={closeModal} disabled={saving} />
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold">Building *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.building}
                                                    onChange={(e) => setForm({ ...form, building: e.target.value })}
                                                    required
                                                    placeholder="e.g. Block A"
                                                    maxLength={100}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="col-md-3">
                                                <label className="form-label fw-bold">Room Number *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.roomNumber}
                                                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                                                    required
                                                    placeholder="A101"
                                                    maxLength={20}
                                                />
                                            </div>

                                            <div className="col-md-3">
                                                <label className="form-label fw-bold">Capacity *</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={form.capacity}
                                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                                    required
                                                    min={1}
                                                    max={1000}
                                                />
                                            </div>
                                        </div>

                                        <hr className="my-4" />

                                        <h6 className="text-muted text-uppercase small mb-3">Resources</h6>

                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="projector"
                                                        checked={form.projector}
                                                        onChange={(e) => setForm({ ...form, projector: e.target.checked })}
                                                    />
                                                    <label className="form-check-label" htmlFor="projector">
                                                        <i className="bi bi-projector me-2"></i>Projector
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="whiteboard"
                                                        checked={form.whiteboard}
                                                        onChange={(e) => setForm({ ...form, whiteboard: e.target.checked })}
                                                    />
                                                    <label className="form-check-label" htmlFor="whiteboard">
                                                        <i className="bi bi-easel me-2"></i>Whiteboard
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="smartBoard"
                                                        checked={form.smartBoard}
                                                        onChange={(e) => setForm({ ...form, smartBoard: e.target.checked })}
                                                    />
                                                    <label className="form-check-label" htmlFor="smartBoard">
                                                        <i className="bi bi-display me-2"></i>Smart Board
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="col-md-6">
                                                <label className="form-label">
                                                    <i className="bi bi-pc-display me-2"></i>Computers
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={form.computers}
                                                    onChange={(e) => setForm({ ...form, computers: e.target.value })}
                                                    min={0}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <ErrorAlert error={formError} onDismiss={() => setFormError(null)} />
                                    </div>

                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-outline-secondary" onClick={closeModal} disabled={saving}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary-edulearn" disabled={saving}>
                                            {saving ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>
                                            ) : (
                                                <><i className="bi bi-check-lg me-2"></i>Create Room</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
