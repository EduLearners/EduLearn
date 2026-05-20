import { useState, useEffect } from 'react';
import { kpiService } from '../../services/kpiService';
import { authService } from '../../services/authService';
import Loading from '../../components/Loading';
import ErrorAlert from '../../components/ErrorAlert';

export default function KpisPage() {
    const { role } = authService.getCurrentUser();

    const [kpis, setKpis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recalculating, setRecalculating] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [success, setSuccess] = useState('');
    const [lastRecalculated, setLastRecalculated] = useState(null);

    const isITAdmin = role === 'ITAdmin';

    useEffect(() => {
        loadKpis();
    }, []);

    const loadKpis = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await kpiService.getAll();
            setKpis(data || []);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            setRecalculating(true);
            setError(null);
            setSuccess('');
            const result = await kpiService.recalculate();
            setKpis(result.kPIs || result.kpis || []);
            setLastRecalculated(result.recalculatedAt);
            setSuccess(`${result.kPIsUpdated || 0} KPIs recalculated successfully.`);
        } catch (err) {
            setError(err);
        } finally {
            setRecalculating(false);
        }
    };

    const handleSeed = async () => {
        try {
            setSeeding(true);
            setError(null);
            setSuccess('');
            await kpiService.seed();
            setSuccess('KPIs seeded successfully.');
            loadKpis();
        } catch (err) {
            setError(err);
        } finally {
            setSeeding(false);
        }
    };

    const getProgressVariant = (current, target) => {
        if (!target || current == null) return 'secondary';
        const pct = (current / target) * 100;
        if (pct >= 90) return 'success';
        if (pct >= 60) return 'warning';
        return 'danger';
    };

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h2 className="text-primary-edulearn mb-0">
                    <i className="bi bi-speedometer2 me-2"></i>KPIs
                </h2>
                <div className="d-flex gap-2">
                    {isITAdmin && (
                        <>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={handleSeed}
                                disabled={seeding}
                            >
                                {seeding
                                    ? <span className="spinner-border spinner-border-sm"></span>
                                    : <><i className="bi bi-database-add me-1"></i>Seed KPIs</>
                                }
                            </button>
                            <button
                                className="btn btn-primary-edulearn btn-sm"
                                onClick={handleRecalculate}
                                disabled={recalculating}
                            >
                                {recalculating
                                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Recalculating...</>
                                    : <><i className="bi bi-arrow-repeat me-1"></i>Recalculate</>
                                }
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Last Recalculated Banner */}
            {lastRecalculated && (
                <div className="alert alert-info mb-4">
                    <i className="bi bi-clock me-2"></i>
                    Last recalculated: {new Date(lastRecalculated).toLocaleString()}
                </div>
            )}

            {success && (
                <div className="alert alert-success mb-4">
                    <i className="bi bi-check-circle me-2"></i>{success}
                </div>
            )}

            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {loading && <Loading message="Loading KPIs..." />}

            {/* Empty State */}
            {!loading && !error && kpis.length === 0 && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-speedometer2 display-4 d-block mb-3"></i>
                    <p className="mb-2">No KPIs found.</p>
                    {isITAdmin && (
                        <button
                            className="btn btn-primary-edulearn mt-2"
                            onClick={handleSeed}
                            disabled={seeding}
                        >
                            <i className="bi bi-database-add me-2"></i>
                            Seed Default KPIs
                        </button>
                    )}
                </div>
            )}

            {/* KPI Cards */}
            {!loading && kpis.length > 0 && (
                <div className="row g-4">
                    {kpis.map(kpi => {
                        const hasTarget = kpi.target != null;
                        const hasCurrent = kpi.currentValue != null;
                        const pct = hasTarget && hasCurrent
                            ? Math.min(100, Math.round((kpi.currentValue / kpi.target) * 100))
                            : null;
                        const variant = getProgressVariant(kpi.currentValue, kpi.target);

                        return (
                            <div key={kpi.kPIID || kpi.kpiID} className="col-md-6">
                                <div className="card shadow-sm h-100">
                                    <div className="card-header bg-light">
                                        <strong>
                                            <i className="bi bi-graph-up me-2"></i>
                                            {kpi.name}
                                        </strong>
                                        <span className="badge bg-secondary ms-2 float-end">
                                            {kpi.reportingPeriod}
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        {kpi.definition && (
                                            <p className="text-muted small mb-3">
                                                {kpi.definition}
                                            </p>
                                        )}

                                        <div className="row g-3 text-center mb-3">
                                            <div className="col-6">
                                                <div className="p-2 bg-light rounded">
                                                    <div className="fs-4 fw-bold text-primary">
                                                        {hasCurrent
                                                            ? Number(kpi.currentValue).toFixed(2)
                                                            : '—'}
                                                    </div>
                                                    <div className="text-muted small">Current</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-2 bg-light rounded">
                                                    <div className="fs-4 fw-bold text-secondary">
                                                        {hasTarget
                                                            ? Number(kpi.target).toFixed(2)
                                                            : '—'}
                                                    </div>
                                                    <div className="text-muted small">Target</div>
                                                </div>
                                            </div>
                                        </div>

                                        {pct !== null && (
                                            <div>
                                                <div className="d-flex justify-content-between small text-muted mb-1">
                                                    <span>Progress</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div className="progress" style={{ height: 10 }}>
                                                    <div
                                                        className={`progress-bar bg-${variant}`}
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}