import { formatCell } from './format.ts'

/** The pressure-Poisson matrix, small enough to print in full. */
export function MatrixGrid({ matrix }: { matrix: number[][] }) {
  return (
    <div className="matrix-scroll">
      <div
        className="matrix-grid"
        style={{ gridTemplateColumns: `repeat(${matrix.length}, 3.6rem)` }}
      >
        {matrix.map((row, i) =>
          row.map((value, j) => (
            <span
              key={`${i}-${j}`}
              className={
                Math.abs(value) < 1e-13
                  ? 'matrix-cell zero'
                  : i === j
                    ? 'matrix-cell diagonal'
                    : 'matrix-cell'
              }
            >
              {Math.abs(value) < 1e-13 ? '·' : formatCell(value)}
            </span>
          )),
        )}
      </div>
    </div>
  )
}
