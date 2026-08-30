import type { EdgeMesh } from '../../../core/projection/edgeMesh.ts'
import { Figure } from '../figures/Figure.tsx'
import { extent } from './format.ts'

const SIZE = 220
const PAD = 18

/**
 * The mesh with pressure shading on the cells and a velocity arrow at every
 * edge midpoint. Both velocity components live on every edge, so each edge
 * carries one arrow rather than a single normal component.
 */
export function FlowFieldFigure({
  mesh,
  u,
  v,
  pressure,
  caption,
}: {
  mesh: EdgeMesh
  u: number[]
  v: number[]
  pressure?: number[]
  caption: string
}) {
  const toX = (x: number) => PAD + x * SIZE
  const toY = (y: number) => PAD + (1 - y) * SIZE
  const speedScale = Math.max(extent(u), extent(v))
  // Longest arrow spans about half a cell, whatever the flow magnitude is.
  const arrow = speedScale < 1e-13 ? 0 : (0.5 * SIZE) / mesh.divisions / speedScale
  const pressureScale = pressure ? extent(pressure) : 0

  return (
    <Figure caption={caption}>
      <svg
        viewBox={`0 0 ${SIZE + 2 * PAD} ${SIZE + 2 * PAD}`}
        className="topic-figure flow-figure"
        role="img"
        aria-label={caption}
      >
        <defs>
          <marker id="flow-tip" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto">
            <path className="fig-arrow-head" d="M0 0 L5 2 L0 4 z" />
          </marker>
        </defs>

        {mesh.cells.map((cell) => {
          const value = pressure ? pressure[cell.id] : 0
          const weight = pressureScale < 1e-13 ? 0 : value / pressureScale
          const alpha = Math.min(Math.abs(weight), 1) * 0.4
          return (
            <rect
              key={cell.id}
              className="flow-cell"
              x={toX(cell.center.x) - SIZE / mesh.divisions / 2}
              y={toY(cell.center.y) - SIZE / mesh.divisions / 2}
              width={SIZE / mesh.divisions}
              height={SIZE / mesh.divisions}
              fill={
                weight >= 0
                  ? `rgba(216, 110, 59, ${alpha})`
                  : `rgba(47, 143, 131, ${alpha})`
              }
            />
          )
        })}

        {mesh.edges.map((edge) => {
          const dx = u[edge.id] * arrow
          const dy = v[edge.id] * arrow
          const x = toX(edge.midpoint.x)
          const y = toY(edge.midpoint.y)
          if (Math.hypot(dx, dy) < 0.6) {
            return <circle key={edge.id} className="flow-node" cx={x} cy={y} r="1.8" />
          }
          return (
            <line
              key={edge.id}
              className="flow-arrow"
              x1={x}
              y1={y}
              x2={x + dx}
              y2={y - dy}
              markerEnd="url(#flow-tip)"
            />
          )
        })}
      </svg>
    </Figure>
  )
}
