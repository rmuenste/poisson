import { Figure } from './Figure.tsx'

// Two neighbouring cells are drawn rather than one: the point of the element
// pair is that a velocity unknown is shared by the two cells meeting at its
// edge, while every pressure unknown belongs to exactly one cell.
const EDGE_MIDPOINTS = [
  { x: 100, y: 34 },
  { x: 100, y: 154 },
  { x: 40, y: 94 },
  { x: 160, y: 94 },
  { x: 220, y: 34 },
  { x: 220, y: 154 },
  { x: 280, y: 94 },
]

export function ElementPairFigure() {
  return (
    <Figure caption="Q̃1/Q0: velocity unknowns are edge mean values (circles), pressure unknowns are element mean values (squares).">
      <svg viewBox="0 0 320 190" className="topic-figure" role="img" aria-label="Nodal points of the rotated bilinear / piecewise constant element pair">
        <rect className="fig-cell" x="40" y="34" width="120" height="120" />
        <rect className="fig-cell" x="160" y="34" width="120" height="120" />

        {[100, 220].map((cx) => (
          <g key={cx}>
            <rect className="fig-pressure-node" x={cx - 9} y="85" width="18" height="18" rx="3" />
            <text className="fig-label-strong" x={cx} y="98" textAnchor="middle">
              p
            </text>
          </g>
        ))}

        {EDGE_MIDPOINTS.map((point) => (
          <circle key={`${point.x}-${point.y}`} className="fig-velocity-node" cx={point.x} cy={point.y} r="6" />
        ))}

        <text className="fig-label" x="100" y="24" textAnchor="middle">
          u, v
        </text>
        <text className="fig-label" x="296" y="98" textAnchor="middle">
          u, v
        </text>
        <text className="fig-label" x="160" y="180" textAnchor="middle">
          shared edge unknown
        </text>
      </svg>
    </Figure>
  )
}
