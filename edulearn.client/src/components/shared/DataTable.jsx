// DataTable.jsx
// Shared sortable data table. Replaces every one-off table built
// per page. Integrates SkeletonRows for loading and EmptyState for
// the empty case.
//
// Props:
//   columns  — array of { key, label, render?, className?, sortable? }
//   data     — array of row objects
//   loading  — boolean
//   keyField — string — field used as React key (default 'id')
//   onRowClick — optional (row) => void
//   emptyIcon  — Bootstrap icon for empty state
//   emptyTitle — title text for empty state
//   emptyDescription — optional description
//   emptyAction — { label, onClick } optional CTA

import SkeletonRows from './SkeletonRows';
import EmptyState   from './EmptyState';
import { useState } from 'react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  keyField = 'id',
  onRowClick,
  emptyIcon = 'bi-table',
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
}) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.className || ''}
                style={col.sortable ? { cursor: 'pointer', userSelect: 'none' } : {}}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  <i
                    className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'} ms-1 small`}
                  ></i>
                )}
              </th>
            ))}
          </tr>
        </thead>

        {loading ? (
          <SkeletonRows rows={5} cols={columns.length} />
        ) : sorted.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} className="p-0 border-0">
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {sorted.map(row => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : {}}
              >
                {columns.map(col => (
                  <td key={col.key} className={col.className || ''}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}
