import type { ElementKind, Mesh, Vector2 } from '../core/fem/mesh.ts'
import { referenceCornerCount } from './InteractiveMeshView.tsx'
import { NODE_COLORS, isQuadKind, referenceNodeCoords, subscript } from './shared.ts'

export function ReferenceTriangleSvg() {
  const vertices = [
    { x: 38, y: 242, label: '(0,0)' },
    { x: 242, y: 242, label: '(1,0)' },
    { x: 38, y: 38, label: '(0,1)' },
  ]

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 38,38" className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      {vertices.map((vertex) => (
        <g key={vertex.label}>
          <circle cx={vertex.x} cy={vertex.y} r="5.5" className="reference-node" />
          <text x={vertex.x + 10} y={vertex.y - 8} className="reference-node-label">
            {vertex.label}
          </text>
        </g>
      ))}
      <text x="116" y="168" className="reference-fill-label">T̂</text>
    </svg>
  )
}

export function ReferenceSquareSvg() {
  const vertices = [
    { x: 38, y: 242, label: '(0,0)' },
    { x: 242, y: 242, label: '(1,0)' },
    { x: 242, y: 38, label: '(1,1)' },
    { x: 38, y: 38, label: '(0,1)' },
  ]

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 242,38 38,38" className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      {vertices.map((vertex) => (
        <g key={vertex.label}>
          <circle cx={vertex.x} cy={vertex.y} r="5.5" className="reference-node" />
          <text x={vertex.x + 10} y={vertex.y - 8} className="reference-node-label">
            {vertex.label}
          </text>
        </g>
      ))}
      <text x="116" y="145" className="reference-fill-label">Q̂</text>
    </svg>
  )
}

export function RefToPhysMappingSvg({
  elementKind,
  mesh,
  selectedElementId,
}: {
  elementKind: ElementKind
  mesh: Mesh
  selectedElementId: number
}) {
  const element = mesh.elements[selectedElementId]
  const colors = NODE_COLORS[elementKind]
  const basisLetter = isQuadKind(elementKind) ? 'N' : 'φ'

  const refCoords = referenceNodeCoords(elementKind)
  const cornerCount = referenceCornerCount(elementKind)
  const refCorners = refCoords.map((coord, index) => ({
    ...coord,
    label: `${basisLetter}${subscript(index + 1)}`,
  }))

  const W = 560, H = 252
  const OX = 28, OY = 216, S = 174  // ref-panel origin and scale
  const RX = 300                     // right-panel x offset

  const toRef = (xi: number, eta: number) => ({ x: OX + xi * S, y: OY - eta * S })
  const toPhys = (px: number, py: number) => ({ x: RX + OX + px * S, y: OY - py * S })

  const refPts = refCorners.map(c => toRef(c.xi, c.eta))
  const physNodePts = element.nodeIds.map(id => mesh.nodes[id].point)
  const physPts = physNodePts.map(p => toPhys(p.x, p.y))

  const refPolygon = refPts.slice(0, cornerCount).map(p => `${p.x},${p.y}`).join(' ')
  const physPolygon = physPts.slice(0, cornerCount).map(p => `${p.x},${p.y}`).join(' ')

  const domainLabel = isQuadKind(elementKind) ? 'Q̂' : 'T̂'

  // Centroid of each shape in SVG coords, for fill labels
  const refFillX = isQuadKind(elementKind) ? OX + S / 2 : OX + S / 3
  const refFillY = isQuadKind(elementKind) ? OY - S / 2 : OY - S / 3
  const physCornerPts = physNodePts.slice(0, cornerCount)
  const physCx = physCornerPts.reduce((s, p) => s + p.x, 0) / physCornerPts.length
  const physCy = physCornerPts.reduce((s, p) => s + p.y, 0) / physCornerPts.length
  const physFill = toPhys(physCx, physCy)

  // Push node labels away from the shape center
  const labelOff = (svgPt: Vector2, centerX: number, centerY: number) => ({
    dx: svgPt.x < centerX ? -34 : 8,
    dy: svgPt.y > centerY ? 15 : -6,
  })

  const ax1 = OX + S + 20
  const ax2 = RX + OX - 16
  const arrowY = H / 2 - 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="reference-svg">
      <rect x="0" y="0" width={W} height={H} rx="22" />
      <defs>
        <marker id="map-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(31,36,48,0.5)" />
        </marker>
      </defs>

      {/* Reference element */}
      <polygon points={refPolygon} className="reference-triangle-shape" />
      <line x1={OX} y1={OY} x2={OX + S + 12} y2={OY} className="reference-axis" />
      <line x1={OX} y1={OY} x2={OX} y2={OY - S - 12} className="reference-axis" />
      <text x={OX + S + 16} y={OY + 5} className="reference-axis-label">ξ</text>
      <text x={OX - 16} y={OY - S - 8} className="reference-axis-label">η</text>
      <text x={refFillX - 6} y={refFillY + 6} className="reference-fill-label">{domainLabel}</text>
      {refPts.map((pt, i) => {
        const { dx, dy } = labelOff(pt, refFillX, refFillY)
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={i < cornerCount ? 6 : 4} fill={colors[i]} />
            <text x={pt.x + dx} y={pt.y + dy} className="reference-node-label">
              {refCorners[i].label}
            </text>
          </g>
        )
      })}

      {/* Arrow */}
      <line
        x1={ax1} y1={arrowY} x2={ax2} y2={arrowY}
        stroke="rgba(31,36,48,0.5)" strokeWidth="2"
        markerEnd="url(#map-arrow)"
      />
      <text x={(ax1 + ax2) / 2} y={arrowY - 9} textAnchor="middle" className="reference-fill-label">F</text>

      {/* Physical element */}
      <polygon points={physPolygon} className="reference-triangle-shape" />
      <line x1={RX + OX} y1={OY} x2={RX + OX + S + 12} y2={OY} className="reference-axis" />
      <line x1={RX + OX} y1={OY} x2={RX + OX} y2={OY - S - 12} className="reference-axis" />
      <text x={RX + OX + S + 16} y={OY + 5} className="reference-axis-label">x</text>
      <text x={RX + OX - 14} y={OY - S - 8} className="reference-axis-label">y</text>
      <text x={physFill.x - 6} y={physFill.y + 6} className="reference-fill-label">K</text>
      {physPts.map((pt, i) => {
        const { dx, dy } = labelOff(pt, physFill.x, physFill.y)
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={i < cornerCount ? 6 : 4} fill={colors[i]} />
            <text x={pt.x + dx} y={pt.y + dy} className="reference-node-label">
              x{subscript(i + 1)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
