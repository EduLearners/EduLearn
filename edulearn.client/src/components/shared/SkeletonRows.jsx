// SkeletonRows.jsx
// Loading skeleton used while data is being fetched.
// Props:
//   rows   — number of skeleton rows to show (default 5)
//   cols   — number of columns per row (default 4)
//   height — row height in px (default 38)

export default function SkeletonRows({ rows = 5, cols = 4, height = 38 }) {
  return (
    <tbody aria-busy="true" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}>
              <div
                className="placeholder-glow"
                style={{ height }}
              >
                <span
                  className="placeholder w-100 rounded"
                  style={{
                    height,
                    display: 'block',
                    background: 'var(--gray-100)',
                    opacity: 0.7,
                  }}
                ></span>
              </div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
