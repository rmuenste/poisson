import { Figure } from './Figure.tsx'

const NEIGHBOURS = [
  { dx: 0, dy: -60 },
  { dx: 0, dy: 60 },
  { dx: -60, dy: 0 },
  { dx: 60, dy: 0 },
]

const CENTER = { x: 130, y: 100 }

export function FivePointStencil() {
  return (
    <Figure caption="On an equidistant mesh the reactive preconditioner P = BᵀMₗ⁻¹B collapses to the familiar 5-point Laplacian stencil (up to the mesh-width scaling).">
      <svg viewBox="0 0 260 200" className="topic-figure" role="img" aria-label="Five point Laplacian stencil">
        {NEIGHBOURS.map((n) => (
          <line
            key={`${n.dx}-${n.dy}`}
            className="fig-stencil-link"
            x1={CENTER.x}
            y1={CENTER.y}
            x2={CENTER.x + n.dx}
            y2={CENTER.y + n.dy}
          />
        ))}

        {NEIGHBOURS.map((n) => (
          <g key={`node-${n.dx}-${n.dy}`}>
            <circle className="fig-stencil-node" cx={CENTER.x + n.dx} cy={CENTER.y + n.dy} r="17" />
            <text
              className="fig-block-label small"
              x={CENTER.x + n.dx}
              y={CENTER.y + n.dy + 5}
              textAnchor="middle"
            >
              −1
            </text>
          </g>
        ))}

        <circle className="fig-stencil-node center" cx={CENTER.x} cy={CENTER.y} r="19" />
        <text className="fig-block-label small" x={CENTER.x} y={CENTER.y + 5} textAnchor="middle">
          4
        </text>

        <text className="fig-label" x="130" y="188" textAnchor="middle">
          the operator the Poisson topic assembles
        </text>
      </svg>
    </Figure>
  )
}
