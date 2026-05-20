import EmptyState from '../../components/shared/EmptyState';

// AuditPackagesPage — /admin/audit-packages
// Owned by Utkarsh (RKA module).
// Backend endpoint: /api/audit-packages/* (to be integrated when API is ready).

export default function AuditPackagesPage() {
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="text-primary-edulearn mb-0">
          <i className="bi bi-archive me-2"></i>Audit Packages
        </h2>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <EmptyState
            icon="bi-archive"
            title="Audit packages coming soon"
            description="This module will allow Auditors to export compliance bundles. Check back after the backend endpoint /api/audit-packages is deployed."
          />
        </div>
      </div>
    </div>
  );
}
