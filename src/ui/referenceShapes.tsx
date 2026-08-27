import * as React from 'react'
import {
  computeJacobianAt,
  createElementGeometry,
  mapToPhysicalPoint,
  type IFiniteElement,
} from '../core/fem/elements.ts'
import type { ElementKind, Mesh, Vector2 } from '../core/fem/mesh.ts'
import { referenceCornerCount } from './InteractiveMeshView.tsx'
import { NODE_COLORS, formatNumber, isQuadKind, referenceNodeCoords, subscript } from './shared.ts'

// Corner markers shared by both reference shapes. Labels next to the right-hand
// corners are centred under/over their node rather than pushed further right:
// at x = 242 a five-character label would run past the 280-unit viewBox edge and
// be clipped.
type ReferenceCorner = {
  x: number
  y: number
  label: string
  dx: number
  dy: number
  anchor: 'start' | 'middle'
}

const ORIGIN_CORNER: ReferenceCorner = {
  x: 38,
  y: 242,
  label: '(0,0)',
  dx: 10,
  dy: -8,
  anchor: 'start',
}

const XI_CORNER: ReferenceCorner = {
  x: 242,
  y: 242,
  label: '(1,0)',
  dx: 0,
  dy: 28,
  anchor: 'middle',
}

const FAR_CORNER: ReferenceCorner = {
  x: 242,
  y: 38,
  label: '(1,1)',
  dx: 0,
  dy: -14,
  anchor: 'middle',
}

const ETA_CORNER: ReferenceCorner = {
  x: 38,
  y: 38,
  label: '(0,1)',
  dx: 10,
  dy: -8,
  anchor: 'start',
}

function ReferenceCornerMarkers({ corners }: { corners: ReferenceCorner[] }) {
  return (
    <>
      {corners.map((corner) => (
        <g key={corner.label}>
          <circle cx={corner.x} cy={corner.y} r="5.5" className="reference-node" />
          <text
            x={corner.x + corner.dx}
            y={corner.y + corner.dy}
            textAnchor={corner.anchor}
            className="reference-node-label"
          >
            {corner.label}
          </text>
        </g>
      ))}
    </>
  )
}

export function ReferenceTriangleSvg() {
  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 38,38" className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      <ReferenceCornerMarkers corners={[ORIGIN_CORNER, XI_CORNER, ETA_CORNER]} />
      <text x="116" y="168" className="reference-fill-label">T̂</text>
    </svg>
  )
}

export function ReferenceSquareSvg() {
  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 242,38 38,38" className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      <ReferenceCornerMarkers
        corners={[ORIGIN_CORNER, XI_CORNER, FAR_CORNER, ETA_CORNER]}
      />
      <text x="116" y="145" className="reference-fill-label">Q̂</text>
    </svg>
  )
}

// --- Element map F: reference element → physical element -------------------
// Both panels are drawn at the same scale, so the reference element and the
// physical domain read as equal-sized squares and F visibly carries one onto a
// single cell of the other.
const MAP_W = 640
const MAP_H = 300
const MAP_OX = 46 // origin of the reference panel (left edge / baseline)
const MAP_OY = 236
const MAP_S = 168 // one unit of reference or physical length, in SVG units
const MAP_RX = 350 // x offset of the physical panel
const MAP_AXIS_OVERHANG = 28 // how far the axes run past the unit box
const MAP_LABEL_GAP = 16 // clearance between a node dot and its label
// A fine mesh shrinks the physical element until its domain letter would sit on
// its own node dots. Drop the letter once it comes closer than this to one,
// which trips at a different mesh density for each element kind — a triangle
// crowds its interior sooner than a quadrilateral of the same width.
const MAP_FILL_LABEL_MIN_CLEARANCE = 14

type LabelPlacement = { x: number; y: number; anchor: 'start' | 'middle' | 'end' }

// Node labels are pushed straight out from the shape's centre. That keeps them
// off the edges, and keeps neighbours MAP_LABEL_GAP apart even when a fine mesh
// shrinks the physical element to a few units across — the element shrinks, the
// text does not.
function outwardLabel(point: Vector2, center: Vector2): LabelPlacement {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const length = Math.hypot(dx, dy)
  // A Q2 centre node has no outward direction; park its label above the centre.
  const ux = length < 1e-9 ? 0 : dx / length
  const uy = length < 1e-9 ? -1 : dy / length
  const distance = length + MAP_LABEL_GAP
  // Text hangs from its baseline, so the vertical nudge differs by direction:
  // clear the cap height going up, the full line going down, centre sideways.
  const baselineNudge = uy > 0.35 ? 10 : uy < -0.35 ? -1 : 4.5
  return {
    x: center.x + ux * distance,
    y: center.y + uy * distance + baselineNudge,
    anchor: ux < -0.35 ? 'end' : ux > 0.35 ? 'start' : 'middle',
  }
}

function polygonPoints(points: Vector2[], cornerCount: number): string {
  return points
    .slice(0, cornerCount)
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
}

function cornerCentroid(points: Vector2[], cornerCount: number): Vector2 {
  const corners = points.slice(0, cornerCount)
  return {
    x: corners.reduce((sum, point) => sum + point.x, 0) / corners.length,
    y: corners.reduce((sum, point) => sum + point.y, 0) / corners.length,
  }
}

// The domain letter is anchored at this reference coordinate in both panels, so
// the K in the physical element is literally the image of the Q̂/T̂ in the
// reference one. It is interior to the triangle as well as the square, and no
// element kind puts a node there — their nodes all sit at 0, ½ or 1.
const MAP_FILL_LABEL_REF: Vector2 = { x: 0.25, y: 0.25 }

function shorterSpan(points: Vector2[], cornerCount: number): number {
  const corners = points.slice(0, cornerCount)
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
}

function distanceToNearest(point: Vector2, others: Vector2[]): number {
  return Math.min(...others.map((other) => Math.hypot(other.x - point.x, other.y - point.y)))
}

export function RefToPhysMappingSvg({
  elementKind,
  mesh,
  selectedElementId,
  finiteElement,
}: {
  elementKind: ElementKind
  mesh: Mesh
  selectedElementId: number
  finiteElement: IFiniteElement
}) {
  const element = mesh.elements[selectedElementId]
  const colors = NODE_COLORS[elementKind]
  const basisLetter = isQuadKind(elementKind) ? 'N' : 'φ'

  const svgRef = React.useRef<SVGSVGElement | null>(null)
  const [probe, setProbe] = React.useState<Vector2 | null>(null)
  const [pinned, setPinned] = React.useState(false)
  const geometry = React.useMemo(
    () => createElementGeometry(mesh, element),
    [mesh, element],
  )

  const refCoords = referenceNodeCoords(elementKind)
  const cornerCount = referenceCornerCount(elementKind)
  const refCorners = refCoords.map((coord, index) => ({
    ...coord,
    label: `${basisLetter}${subscript(index + 1)}`,
  }))

  const W = MAP_W
  const H = MAP_H
  const OX = MAP_OX
  const OY = MAP_OY
  const S = MAP_S
  const RX = MAP_RX

  const toRef = (xi: number, eta: number) => ({ x: OX + xi * S, y: OY - eta * S })
  const toPhys = (px: number, py: number) => ({ x: RX + OX + px * S, y: OY - py * S })

  const refPts = refCorners.map((corner) => toRef(corner.xi, corner.eta))
  const physNodePts = element.nodeIds.map((id) => mesh.nodes[id].point)
  const physPts = physNodePts.map((point) => toPhys(point.x, point.y))

  const refPolygon = polygonPoints(refPts, cornerCount)
  const physPolygon = polygonPoints(physPts, cornerCount)

  const domainLabel = isQuadKind(elementKind) ? 'Q̂' : 'T̂'

  const refCenter = cornerCentroid(refPts, cornerCount)
  const physCenter = cornerCentroid(physPts, cornerCount)
  const refFill = toRef(MAP_FILL_LABEL_REF.x, MAP_FILL_LABEL_REF.y)
  const physFillPoint = mapToPhysicalPoint(finiteElement, geometry, MAP_FILL_LABEL_REF)
  const physFill = toPhys(physFillPoint.x, physFillPoint.y)
  // The reference panel is a fixed size, so only the physical letter can crowd.
  const showPhysFillLabel =
    distanceToNearest(physFill, physPts) >= MAP_FILL_LABEL_MIN_CLEARANCE
  // Full-size dots would swallow a cell of a fine mesh whole, so they shrink
  // with the element and it stays readable as a shape rather than a blob.
  const physSpan = shorterSpan(physPts, cornerCount)
  const physCornerRadius = Math.min(6, physSpan / 3)
  const physInnerRadius = Math.min(4, physSpan / 4.5)

  const refAxisEndX = OX + S + MAP_AXIS_OVERHANG
  const refAxisEndY = OY - S - MAP_AXIS_OVERHANG
  const physOriginX = RX + OX
  const physAxisEndX = physOriginX + S + MAP_AXIS_OVERHANG

  const arrowX1 = refAxisEndX + 22
  const arrowX2 = physOriginX - 46
  const arrowY = H / 2 - 8

  const clampToDomain = (xi: number, eta: number): Vector2 => {
    let x = Math.min(1, Math.max(0, xi))
    let y = Math.min(1, Math.max(0, eta))
    if (!isQuadKind(elementKind) && x + y > 1) {
      const excess = (x + y - 1) / 2
      x = Math.min(1, Math.max(0, x - excess))
      y = Math.min(1, Math.max(0, y - excess))
    }
    return { x, y }
  }

  const probeFromEvent = (event: React.PointerEvent): Vector2 | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = rect.width / W
    const svgX = (event.clientX - rect.left) / scale
    const svgY = (event.clientY - rect.top) / scale
    const xi = (svgX - OX) / S
    const eta = (OY - svgY) / S
    // Only probe while the pointer is over (or near) the reference panel.
    if (xi < -0.08 || xi > 1.15 || eta < -0.08 || eta > 1.15) return null
    return clampToDomain(xi, eta)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (pinned) return
    setProbe(probeFromEvent(event))
  }

  const handlePointerLeave = () => {
    if (!pinned) setProbe(null)
  }

  const handleClick = (event: React.PointerEvent | React.MouseEvent) => {
    if (pinned) {
      setPinned(false)
      setProbe(probeFromEvent(event as React.PointerEvent))
      return
    }
    const next = probeFromEvent(event as React.PointerEvent)
    if (next) {
      setProbe(next)
      setPinned(true)
    }
  }

  const probeData = probe
    ? {
        physical: mapToPhysicalPoint(finiteElement, geometry, probe),
        determinant: computeJacobianAt(finiteElement, geometry, probe).determinant,
        shapeValues: finiteElement.shapeFunctions(probe),
      }
    : null
  const probeRefPt = probe ? toRef(probe.x, probe.y) : null
  const probePhysPt = probeData ? toPhys(probeData.physical.x, probeData.physical.y) : null

  return (
    <div className="map-explorer">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="reference-svg map-interactive"
      ref={svgRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <rect x="0" y="0" width={W} height={H} rx="22" />
      <defs>
        <marker id="map-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(31,36,48,0.5)" />
        </marker>
      </defs>

      {/* Reference element */}
      <polygon points={refPolygon} className="reference-triangle-shape" />
      <line x1={OX} y1={OY} x2={refAxisEndX} y2={OY} className="reference-axis" />
      <line x1={OX} y1={OY} x2={OX} y2={refAxisEndY} className="reference-axis" />
      <text x={refAxisEndX + 8} y={OY + 5} className="reference-axis-label">ξ</text>
      <text x={OX} y={refAxisEndY - 10} textAnchor="middle" className="reference-axis-label">η</text>
      <text x={refFill.x} y={refFill.y + 6} textAnchor="middle" className="reference-fill-label">
        {domainLabel}
      </text>
      {refPts.map((pt, i) => {
        const placement = outwardLabel(pt, refCenter)
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={i < cornerCount ? 6 : 4} fill={colors[i]} />
            <text
              x={placement.x}
              y={placement.y}
              textAnchor={placement.anchor}
              className="reference-node-label"
            >
              {refCorners[i].label}
            </text>
          </g>
        )
      })}

      {/* Arrow */}
      <line
        x1={arrowX1} y1={arrowY} x2={arrowX2} y2={arrowY}
        stroke="rgba(31,36,48,0.5)" strokeWidth="2"
        markerEnd="url(#map-arrow)"
      />
      <text x={(arrowX1 + arrowX2) / 2} y={arrowY - 9} textAnchor="middle" className="reference-fill-label">F</text>

      {/* Physical element, drawn inside the whole domain so the selected cell
          keeps its position in Ω rather than filling the panel. */}
      <rect
        x={physOriginX}
        y={OY - S}
        width={S}
        height={S}
        className="map-domain-outline"
      />
      <text x={physOriginX + S} y={OY - S - 12} textAnchor="end" className="reference-axis-label">
        Ω
      </text>
      <polygon points={physPolygon} className="reference-triangle-shape" />
      <line x1={physOriginX} y1={OY} x2={physAxisEndX} y2={OY} className="reference-axis" />
      <line x1={physOriginX} y1={OY} x2={physOriginX} y2={refAxisEndY} className="reference-axis" />
      <text x={physAxisEndX + 8} y={OY + 5} className="reference-axis-label">x</text>
      <text x={physOriginX} y={refAxisEndY - 10} textAnchor="middle" className="reference-axis-label">y</text>
      {showPhysFillLabel ? (
        <text x={physFill.x} y={physFill.y + 6} textAnchor="middle" className="reference-fill-label">
          K
        </text>
      ) : null}
      {physPts.map((pt, i) => {
        const placement = outwardLabel(pt, physCenter)
        return (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={i < cornerCount ? physCornerRadius : physInnerRadius}
              fill={colors[i]}
            />
            {/* Only the corners are labelled here: a fine mesh packs the
                mid-side nodes too closely for text to stay legible, and the
                table below carries every node anyway. */}
            {i < cornerCount ? (
              <text
                x={placement.x}
                y={placement.y}
                textAnchor={placement.anchor}
                className="reference-node-label"
              >
                x{subscript(i + 1)}
              </text>
            ) : null}
          </g>
        )
      })}

      {/* Probe: reference point and its image under F */}
      {probeRefPt && probePhysPt ? (
        <g pointerEvents="none">
          <line
            x1={probeRefPt.x}
            y1={probeRefPt.y}
            x2={probePhysPt.x}
            y2={probePhysPt.y}
            className="map-probe-link"
          />
          <circle cx={probeRefPt.x} cy={probeRefPt.y} r="5" className="map-probe-point" />
          <circle cx={probePhysPt.x} cy={probePhysPt.y} r="5" className="map-probe-point" />
        </g>
      ) : null}
    </svg>
    <div className="map-probe-readout" aria-live="polite">
      {probe && probeData ? (
        <>
          <div className="map-probe-line">
            <span className="mono">
              F({formatNumber(probe.x)}, {formatNumber(probe.y)}) = (
              {formatNumber(probeData.physical.x)}, {formatNumber(probeData.physical.y)})
            </span>
            <span className="mono">det J = {formatNumber(probeData.determinant)}</span>
            {pinned ? <span className="map-probe-pin">pinned — click to release</span> : null}
          </div>
          <div className="map-probe-chips">
            {probeData.shapeValues.map((value, i) => (
              <span key={i} className="map-chip">
                <i style={{ background: colors[i] }} aria-hidden="true" />
                {basisLetter}{subscript(i + 1)} = {value.toFixed(3)}
              </span>
            ))}
            <span className="map-chip map-chip-sum">
              Σ = {probeData.shapeValues.reduce((acc, v) => acc + v, 0).toFixed(3)}
            </span>
          </div>
        </>
      ) : (
        <span className="map-probe-hint">
          Move the pointer over the reference element to probe the map F — the image point
          appears in the physical element. Click to pin the probe.
        </span>
      )}
    </div>
    </div>
  )
}
