import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

const ALL_ROLES = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];
const ALL_STATUSES = ['Active', 'Inactive', 'Suspended', 'Locked', 'Withdrawn'];
const RB = { Student: { bg: '#E6F1FB', color: '#0C447C' }, Instructor: { bg: '#EAF3DE', color: '#27500A' }, Registrar: { bg: '#EEEDFE', color: '#3C3489' }, DeptAdmin: { bg: '#FAEEDA', color: '#633806' }, Finance: { bg: '#EAF3DE', color: '#27500A' }, ITAdmin: { bg: '#FCEBEB', color: '#791F1F' }, Auditor: { bg: '#E1F5EE', color: '#085041' } };
const EF = { username: '', fullName: '', email: '', phone: '', role: 'Student', password: '', sendInvite: true };
const TH = { color: 'white', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 16px', whiteSpace: 'nowrap' };
const TD = { padding: '14px 16px' };

function Portal({ children }) { return createPortal(children, document.body); }

function ModalShell({ show, title, icon, onClose, disabled, maxWidth, children }) {
    if (!show) return null;
    return <Portal><>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', zIndex: 2000, animation: 'modalFadeIn 0.25s ease both' }} />
        <div style={{ position: 'fixed', inset: 0, zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: maxWidth || 720, borderRadius: 16, background: 'white', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto', animation: 'modalSlideUp 0.3s ease both' }}>
                <div style={{ background: 'linear-gradient(135deg,#1a3c6e,#2a5a9e)', color: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}><i className={`bi ${icon} me-2`} />{title}</h5>
                    <button style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: 0 }} onClick={onClose} disabled={disabled}><i className="bi bi-x-lg" /></button>
                </div>
                {children}
            </div>
        </div>
    </></Portal>;
}

function ModalFooter({ onCancel, disabled, saving, label }) {
    return <div style={{ background: '#f8f9fa', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 10 }} onClick={onCancel} disabled={disabled}>Cancel</button>
        <button type="submit" className="btn" style={{ background: 'linear-gradient(135deg,#1a3c6e,#2a5a9e)', color: 'white', border: 'none', borderRadius: 10 }} disabled={disabled}>{saving ? <><span className="spinner-border spinner-border-sm me-2" />{label || 'Saving...'}</> : <><i className="bi bi-check-lg me-2" />{label || 'Save'}</>}</button>
    </div>;
}

function ActionBtn({ icon, onClick, hoverBg, hoverColor, hoverBorder, title }) {
    return <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', color: '#666' }} onClick={onClick} title={title} onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder; }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#e0e0e0'; }}><i className={`bi ${icon}`} style={{ fontSize: 13 }} /></button>;
}

function AnimatedSelect({ value, onChange, options, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const selected = options.find(o => o.value === value);
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: open ? '1px solid #2a5a9e' : '1px solid #e0e0e0', background: 'white', cursor: 'pointer', fontSize: 13, color: value ? '#222' : '#888', transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxShadow: open ? '0 0 0 3px rgba(26,60,110,0.1)' : 'none', userSelect: 'none' }}>
                <span>{selected ? selected.label : placeholder}</span>
                <i className="bi bi-chevron-down" style={{ fontSize: 12, color: '#888', transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', borderRadius: 12, border: '0.5px solid #e8e8e8', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 9999, overflow: 'hidden', opacity: open ? 1 : 0, transform: open ? 'translateY(0) scaleY(1)' : 'translateY(-6px) scaleY(0.96)', pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s ease, transform 0.2s ease', transformOrigin: 'top center', maxHeight: 220, overflowY: 'auto' }}>
                {options.map((o, i) => (
                    <div key={o.value ?? i} onClick={() => { onChange(o.value); setOpen(false); }} style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: value === o.value ? '#f0f4fa' : 'transparent', color: value === o.value ? '#1a3c6e' : '#333', fontWeight: value === o.value ? 600 : 400, transition: 'background 0.12s ease', borderBottom: i < options.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = '#f8f9fa'; }} onMouseLeave={e => { e.currentTarget.style.background = value === o.value ? '#f0f4fa' : 'transparent'; }}>
                        <span>{o.label}</span>
                        {value === o.value && <i className="bi bi-check-lg" style={{ color: '#1a3c6e', fontSize: 14 }} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function CountUp({ target, duration = 600, delay = 200 }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target == null || target === 0) { setCount(0); return; }
        const timer = setTimeout(() => {
            const start = performance.now();
            const animate = (now) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 2.5);
                setCount(Math.round(eased * target));
                if (progress < 1) requestAnimationFrame(animate);
                else setCount(target);
            };
            requestAnimationFrame(animate);
        }, delay);
        return () => clearTimeout(timer);
    }, [target, duration, delay]);
    return <>{count}</>;
}

export default function UsersPage() {
    const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [success, setSuccess] = useState('');
    const [search, setSearch] = useState(''); const [filterRole, setFilterRole] = useState(''); const [filterStatus, setFilterStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false); const [createForm, setCreateForm] = useState(EF); const [creating, setCreating] = useState(false); const [createError, setCreateError] = useState(null);
    const [showEdit, setShowEdit] = useState(false); const [editTarget, setEditTarget] = useState(null); const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' }); const [editing, setEditing] = useState(false); const [editError, setEditError] = useState(null);
    const [showStatus, setShowStatus] = useState(false); const [statusTarget, setStatusTarget] = useState(null); const [newStatus, setNewStatus] = useState(''); const [statusSaving, setStatusSaving] = useState(false);
    const [mfaResetTarget, setMfaResetTarget] = useState(null); const [mfaResetting, setMfaResetting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { try { setLoading(true); setError(null); setUsers(await userService.getAll() || []); } catch (e) { setError(e); } finally { setLoading(false); } };

    const handleCreate = async (e) => { e.preventDefault(); setCreateError(null); setCreating(true); try { await userService.create({ ...createForm, phone: createForm.phone || null }); setSuccess(createForm.sendInvite ? `User "${createForm.username}" created. Welcome email sent.` : `User "${createForm.username}" created.`); setCreateForm(EF); setShowCreate(false); loadUsers(); } catch (e) { setCreateError(e); } finally { setCreating(false); } };
    const openEdit = u => { setEditTarget(u); setEditForm({ fullName: u.fullName, email: u.email, phone: u.phone || '' }); setEditError(null); setShowEdit(true); };
    const handleEdit = async (e) => { e.preventDefault(); setEditError(null); setEditing(true); try { await userService.update(editTarget.userID, editForm); setSuccess(`User "${editTarget.username}" updated.`); setShowEdit(false); loadUsers(); } catch (e) { setEditError(e); } finally { setEditing(false); } };
    const openStatus = u => { setStatusTarget(u); setNewStatus(u.status); setShowStatus(true); };
    const handleStatusUpdate = async () => { setStatusSaving(true); try { await userService.updateStatus(statusTarget.userID, newStatus); setSuccess(`${statusTarget.username} status: ${newStatus}`); setShowStatus(false); loadUsers(); } catch (e) { setError(e); setShowStatus(false); } finally { setStatusSaving(false); } };
    const handleMfaReset = async () => { setMfaResetting(true); try { await userService.resetMfa(mfaResetTarget.userID); setSuccess(`MFA reset for "${mfaResetTarget.username}".`); setMfaResetTarget(null); loadUsers(); } catch (e) { setError(e); setMfaResetTarget(null); } finally { setMfaResetting(false); } };
    const handleInvite = async u => { try { await userService.inviteUser(u.userID); setSuccess(`Invite sent to ${u.email}.`); } catch (e) { setError(e); } };

    const q = search.toLowerCase();
    const filtered = users.filter(u => (u.username?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) && (!filterRole || u.role === filterRole) && (!filterStatus || u.status === filterStatus));
    const rc = {}; users.forEach(u => { rc[u.role] = (rc[u.role] || 0) + 1; });
    const activeCount = users.filter(u => u.status === 'Active').length;
    const mfaCount = users.filter(u => u.mfaEnabled).length;
    const STATS = [
        { label: 'Total Users', value: users.length, icon: 'bi-people-fill', color: '#185FA5', bg: 'linear-gradient(135deg,#E6F1FB,#d4e8f8)' },
        { label: 'Active', value: activeCount, icon: 'bi-check-circle-fill', color: '#27500A', bg: 'linear-gradient(135deg,#EAF3DE,#d8ebc5)' },
        { label: 'MFA Enabled', value: mfaCount, icon: 'bi-shield-check', color: '#3C3489', bg: 'linear-gradient(135deg,#EEEDFE,#dddaf8)' },
        { label: 'Roles', value: Object.keys(rc).length, icon: 'bi-diagram-3-fill', color: '#854F0B', bg: 'linear-gradient(135deg,#FAEEDA,#f5e0c0)' },
    ];

    return (
        <div>
            <style>{`@keyframes umF{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <div className="d-flex align-items-center justify-content-between mb-4" style={{ animation: 'umF 0.4s ease both' }}>
                <div>
                    <h4 className="mb-1" style={{ fontWeight: 600, color: '#1a3c6e', fontSize: 22 }}><i className="bi bi-people me-2" />User Management</h4>
                    <p className="mb-0" style={{ fontSize: 13, color: '#888' }}>{users.length} users across {Object.keys(rc).length} roles</p>
                </div>
                <button className="btn d-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg,#1a3c6e,#2a5a9e)', color: 'white', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, border: 'none', transition: 'all 0.2s' }} onClick={() => { setShowCreate(true); setCreateError(null); }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,60,110,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <i className="bi bi-person-plus" />Create User
                </button>
            </div>

            {success && <div className="d-flex align-items-center justify-content-between mb-4" style={{ background: '#E1F5EE', color: '#085041', borderRadius: 12, padding: '12px 16px', fontSize: 13, animation: 'umF 0.3s ease both' }}><span><i className="bi bi-check-circle me-2" />{success}</span><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#085041', fontSize: 16 }} onClick={() => setSuccess('')}><i className="bi bi-x-lg" /></button></div>}

            {!loading && <div className="row g-3 mb-4">
                {STATS.map((s, i) => <div key={i} className="col-md-3 col-sm-6" style={{ animation: `umF 0.4s ease ${0.1 + i * 0.08}s both` }}>
                    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 20px', border: '0.5px solid #e8e8e8', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span style={{ fontSize: 11, color: s.color, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.label}</span>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`bi ${s.icon}`} style={{ fontSize: 15, color: s.color }} /></div>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}><CountUp target={s.value} delay={200 + i * 80} /></div>
                    </div>
                </div>)}
            </div>}

            <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', padding: '16px 20px', marginBottom: 16, animation: 'umF 0.4s ease 0.35s both', position: 'relative', zIndex: 100, overflow: 'visible' }}>
                <div className="row g-3 align-items-center">
                    <div className="col-md-5">
                        <div style={{ position: 'relative' }}>
                            <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }} />
                            <input type="text" style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }} placeholder="Search by username, name or email..." value={search} onChange={e => setSearch(e.target.value)} onFocus={e => e.target.style.borderColor = '#2a5a9e'} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
                        </div>
                    </div>
                    <div className="col-md-3"><AnimatedSelect value={filterRole} onChange={v => setFilterRole(v)} placeholder="All Roles" options={[{ value: '', label: 'All Roles' }, ...ALL_ROLES.map(r => ({ value: r, label: r }))]} /></div>
                    <div className="col-md-2"><AnimatedSelect value={filterStatus} onChange={v => setFilterStatus(v)} placeholder="All Statuses" options={[{ value: '', label: 'All Statuses' }, ...ALL_STATUSES.map(s => ({ value: s, label: s }))]} /></div>
                    <div className="col-md-2"><button style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e0e0e0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#666', transition: 'all 0.15s' }} onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }} onMouseEnter={e => { e.currentTarget.style.background = '#f0f4fa'; e.currentTarget.style.color = '#1a3c6e'; }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#666'; }}><i className="bi bi-x-lg me-1" />Clear</button></div>
                </div>
            </div>

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading users..." />}
            {!loading && !error && filtered.length === 0 && <div className="text-center py-5"><i className="bi bi-people" style={{ fontSize: 48, color: '#c0cee0' }} /><p className="mt-3 mb-0" style={{ color: '#888', fontSize: 14 }}>No users match your search.</p></div>}

            {!loading && filtered.length > 0 && <div style={{ background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', overflow: 'hidden', animation: 'umF 0.4s ease 0.4s both' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a3c6e', display: 'flex', alignItems: 'center', gap: 8 }}><i className="bi bi-table" />Users</span>
                    <span style={{ fontSize: 12, color: '#888' }}>{filtered.length} of {users.length} user(s)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: 'linear-gradient(90deg,#1a3c6e,#2a5a9e)' }}>
                            {['ID','Username','Full Name','Email','Phone','Role','MFA','Status','Created','Actions'].map(h => <th key={h} style={TH}>{h}</th>)}
                        </tr></thead>
                        <tbody>{filtered.map(u => {
                            const rs = RB[u.role] || { bg: '#F1EFE8', color: '#444441' };
                            return <tr key={u.userID} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => navigate(`/users/${u.userID}`)} onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={TD}><code style={{ background: '#f0f4fa', color: '#1a3c6e', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>#{u.userID}</code></td>
                                <td style={{ ...TD, fontWeight: 600 }}>{u.username}</td>
                                <td style={TD}>{u.fullName}</td>
                                <td style={{ ...TD, fontSize: 12, color: '#666' }}>{u.email}</td>
                                <td style={{ ...TD, fontSize: 12, color: '#888' }}>{u.phone || '\u2014'}</td>
                                <td style={TD}><span style={{ background: rs.bg, color: rs.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8 }}>{u.role}</span></td>
                                <td style={TD}>{u.mfaEnabled ? <span style={{ background: '#E1F5EE', color: '#085041', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="bi bi-shield-check" />On</span> : <span style={{ background: '#F1EFE8', color: '#888', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>Off</span>}</td>
                                <td style={TD}><StatusBadge status={u.status} /></td>
                                <td style={{ ...TD, fontSize: 12, color: '#888', fontVariantNumeric: 'tabular-nums' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</td>
                                <td style={TD}><div style={{ display: 'flex', gap: 4 }}>
                                    <ActionBtn icon="bi-pencil" onClick={e => { e.stopPropagation(); openEdit(u); }} title="Edit" hoverBg="#E6F1FB" hoverColor="#1a3c6e" hoverBorder="#185FA5" />
                                    <ActionBtn icon="bi-toggle-on" onClick={e => { e.stopPropagation(); openStatus(u); }} title="Status" hoverBg="#EEEDFE" hoverColor="#3C3489" hoverBorder="#3C3489" />
                                    <ActionBtn icon="bi-envelope" onClick={e => { e.stopPropagation(); handleInvite(u); }} title="Invite" hoverBg="#E1F5EE" hoverColor="#085041" hoverBorder="#0F6E56" />
                                    {u.mfaEnabled && <ActionBtn icon="bi-shield-x" onClick={e => { e.stopPropagation(); setMfaResetTarget(u); }} title="Reset MFA" hoverBg="#FAEEDA" hoverColor="#854F0B" hoverBorder="#854F0B" />}
                                </div></td>
                            </tr>;
                        })}</tbody>
                    </table>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#888', background: '#fafbfc' }}>Showing {filtered.length} of {users.length} users</div>
            </div>}

            <ModalShell show={showCreate} title="Create New User" icon="bi-person-plus" onClose={() => setShowCreate(false)} disabled={creating}>
                <form onSubmit={handleCreate}>
                    <div style={{ padding: 24 }}>
                        <div style={{ background: '#E6F1FB', color: '#0C447C', borderRadius: 10, fontSize: 13, padding: '10px 16px', marginBottom: 20 }}><i className="bi bi-info-circle me-2" />Privileged roles are required to set up MFA on first login.</div>
                        <div className="row g-3">
                            <div className="col-md-6"><label className="form-label fw-bold">Username <span className="text-danger">*</span></label><input type="text" className="form-control" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="e.g. john.doe" maxLength={100} required /></div>
                            <div className="col-md-6"><label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label><input type="text" className="form-control" value={createForm.fullName} onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="e.g. John Doe" maxLength={200} required /></div>
                            <div className="col-md-6"><label className="form-label fw-bold">Email <span className="text-danger">*</span></label><input type="email" className="form-control" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="e.g. john@example.com" maxLength={255} required /></div>
                            <div className="col-md-6"><label className="form-label fw-bold">Phone</label><input type="text" className="form-control" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="e.g. +91-9876543210" maxLength={20} /></div>
                            <div className="col-md-6"><label className="form-label fw-bold">Role <span className="text-danger">*</span></label><select className="form-select" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })} required>{ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                            <div className="col-md-6"><label className="form-label fw-bold">Password <span className="text-danger">*</span></label><input type="password" className="form-control" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 8 characters" minLength={8} required /></div>
                            <div className="col-12"><div className="p-3 rounded d-flex align-items-start gap-3" style={{ background: '#f8f9fa' }}><input type="checkbox" className="form-check-input mt-1" id="inv" checked={createForm.sendInvite} onChange={e => setCreateForm({ ...createForm, sendInvite: e.target.checked })} /><label htmlFor="inv" style={{ cursor: 'pointer' }}><div className="fw-bold" style={{ fontSize: 13 }}><i className="bi bi-envelope me-2" />Send welcome email</div><small className="text-muted">Sends login details to {createForm.email || "the user's email"}.</small></label></div></div>
                        </div>
                        <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                    </div>
                    <ModalFooter onCancel={() => setShowCreate(false)} disabled={creating} saving={creating} label={creating ? 'Creating...' : 'Create User'} />
                </form>
            </ModalShell>

            <ModalShell show={showEdit && !!editTarget} title={`Edit User \u2014 ${editTarget?.username || ''}`} icon="bi-pencil" onClose={() => setShowEdit(false)} disabled={editing} maxWidth={520}>
                <form onSubmit={handleEdit}>
                    <div style={{ padding: 24 }}>
                        <div className="row g-3">
                            <div className="col-12"><label className="form-label fw-bold">Full Name <span className="text-danger">*</span></label><input type="text" className="form-control" value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} maxLength={200} required /></div>
                            <div className="col-12"><label className="form-label fw-bold">Email <span className="text-danger">*</span></label><input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} maxLength={255} required /></div>
                            <div className="col-12"><label className="form-label fw-bold">Phone</label><input type="text" className="form-control" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} maxLength={20} /></div>
                        </div>
                        <ErrorAlert error={editError} onDismiss={() => setEditError(null)} />
                    </div>
                    <ModalFooter onCancel={() => setShowEdit(false)} disabled={editing} saving={editing} label={editing ? 'Saving...' : 'Save Changes'} />
                </form>
            </ModalShell>

            <ModalShell show={showStatus && !!statusTarget} title={`Change Status \u2014 ${statusTarget?.username || ''}`} icon="bi-toggle-on" onClose={() => setShowStatus(false)} disabled={statusSaving} maxWidth={480}>
                <div style={{ padding: 24 }}>
                    <p className="mb-3" style={{ color: '#888', fontSize: 13 }}>Current status: <StatusBadge status={statusTarget?.status} /></p>
                    <label className="form-label fw-bold">New Status</label>
                    <div className="d-flex flex-wrap gap-3 mb-3">{ALL_STATUSES.map(s => <div key={s} className="form-check"><input className="form-check-input" type="radio" name="st" id={`st-${s}`} value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} /><label className="form-check-label" htmlFor={`st-${s}`}>{s}</label></div>)}</div>
                    {(newStatus === 'Locked' || newStatus === 'Suspended') && <div style={{ background: '#FAEEDA', color: '#633806', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}><i className="bi bi-exclamation-triangle me-2" />This user will not be able to log in.</div>}
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 10 }} onClick={() => setShowStatus(false)} disabled={statusSaving}>Cancel</button>
                    <button type="button" className="btn" style={{ background: 'linear-gradient(135deg,#1a3c6e,#2a5a9e)', color: 'white', border: 'none', borderRadius: 10 }} onClick={handleStatusUpdate} disabled={statusSaving || newStatus === statusTarget?.status}>{statusSaving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : <><i className="bi bi-check-lg me-2" />Update Status</>}</button>
                </div>
            </ModalShell>

            <ConfirmDialog show={!!mfaResetTarget} title="Reset MFA" message={`Reset MFA for "${mfaResetTarget?.username}"? They must re-enroll on next login.`} confirmText={mfaResetting ? 'Resetting...' : 'Reset MFA'} confirmVariant="warning" onConfirm={handleMfaReset} onCancel={() => !mfaResetting && setMfaResetTarget(null)} />
        </div>
    );
}
