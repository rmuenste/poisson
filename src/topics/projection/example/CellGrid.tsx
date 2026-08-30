import { extent, formatCell } from './format.ts'

/**
 * One number per pressure cell, laid out as the mesh is: cell (i,j) with j = 0
 * at the bottom, so the grid reads like the domain rather than like an array.
 */
export function CellGrid({
  values,
  divisions,
  label,
}: {
  values: number[]
  divisions: number
  label: string
}) {
  const scale = extent(values)
  const rows = Array.from({ length: divisions }, (_, row) => divisions - 1 - row)

  return (
    <div className="cell-grid-block">
      <h4>{label}</h4>
      <div
        className="cell-grid"
        style={{ gridTemplateColumns: `repeat(${divisions}, minmax(0, 1fr))` }}
      >
        {rows.map((j) =>
          Array.from({ length: divisions }, (_, i) => {
            const value = values[j * divisions + i]
            const weight = scale < 1e-13 ? 0 : value / scale
            return (
              <span
                key={`${i}-${j}`}
                className="cell-grid-item"
                style={{ background: shade(weight) }}
                title={`cell (${i}, ${j}) = ${value}`}
              >
                {formatCell(value)}
              </span>
            )
          }),
        )}
      </div>
    </div>
  )
}

/** Warm for positive, cool for negative, transparent at zero. */
function shade(weight: number): string {
  const alpha = Math.min(Math.abs(weight), 1) * 0.42
  return weight >= 0
    ? `rgba(216, 110, 59, ${alpha})`
    : `rgba(47, 143, 131, ${alpha})`
}
