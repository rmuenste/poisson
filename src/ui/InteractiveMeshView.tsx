import * as React from 'react'
import type { ElementKind, Mesh, MeshElement, Vector2 } from '../core/fem/mesh.ts'

export function referenceCornerCount(kind: ElementKind): number {
  return kind === 'quad' || kind === 'quad-q2' ? 4 : 3
}

export function projectPoint(point: Vector2, width: number, height: number): Vector2 {
  const padding = 24
  return {
    x: padding + point.x * (width - 2 * padding),
    y: height - padding - point.y * (height - 2 * padding),
  }
}

function elementOrderLabel(kind: ElementKind): string {
  switch (kind) {
    case 'triangle':
      return 'P1 triangle'
    case 'quad':
      return 'Q1 quadrilateral'
    case 'triangle-p2':
      return 'P2 triangle'
    case 'quad-q2':
      return 'Q2 quadrilateral'
  }
}

function isQuadraticKind(kind: ElementKind): boolean {
  return kind === 'triangle-p2' || kind === 'quad-q2'
}

function cornerPolygonPoints(mesh: Mesh, element: MeshElement, size: number): string {
  return element.nodeIds
    .slice(0, referenceCornerCount(mesh.elementKind))
    .map((id) => projectPoint(mesh.nodes[id].point, size, size))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
}

const MeshPolygons = React.memo(function MeshPolygons({
  mesh,
  selectedElementId,
  size,
}: {
  mesh: Mesh
  selectedElementId: number
  size: number
}) {
  return (
    <g>
      {mesh.elements.map((element) => (
        <polygon
          key={element.id}
          points={cornerPolygonPoints(mesh, element, size)}
          data-element-id={element.id}
          className={element.id === selectedElementId ? 'mesh-element selected' : 'mesh-element'}
        />
      ))}
    </g>
  )
})

function SelectedOutline({
  mesh,
  selectedElementId,
  size,
}: {
  mesh: Mesh
  selectedElementId: number
  size: number
}) {
  const element = mesh.elements[selectedElementId]
  if (!element) {
    return null
  }
  return (
    <polygon
      points={cornerPolygonPoints(mesh, element, size)}
      className="mesh-selected-outline"
    />
  )
}

const MeshNodesLayer = React.memo(function MeshNodesLayer({
  mesh,
  size,
  compact,
}: {
  mesh: Mesh
  size: number
  compact: boolean
}) {
  const cornerNodeIds = React.useMemo(() => {
    const ids = new Set<number>()
    const cornerCount = referenceCornerCount(mesh.elementKind)
    for (const element of mesh.elements) {
      for (let i = 0; i < cornerCount; i += 1) {
        ids.add(element.nodeIds[i])
      }
    }
    return ids
  }, [mesh])

  // Structured meshes have (k+1)² nodes on a square grid; shrink dots with
  // grid density so fine meshes stay readable instead of a wall of circles.
  const gridSpacing = (size - 48) / Math.max(Math.sqrt(mesh.nodes.length) - 1, 1)
  const cornerRadius = Math.min(compact ? 2.6 : 3.6, gridSpacing * 0.3)
  const smallRadius = Math.min(compact ? 1.6 : 2.2, gridSpacing * 0.18)

  return (
    <g pointerEvents="none">
      {mesh.nodes.map((node) => {
        const projected = projectPoint(node.point, size, size)
        const isCorner = cornerNodeIds.has(node.id)
        const radius = isCorner ? cornerRadius : smallRadius
        const className = mesh.boundaryNodeIds.has(node.id)
          ? 'mesh-node boundary'
          : 'mesh-node free'
        return <circle key={node.id} cx={projected.x} cy={projected.y} r={radius} className={className} />
      })}
    </g>
  )
})

function MeshLegend({ higherOrder }: { higherOrder: boolean }) {
  return (
    <span className="mesh-legend">
      <span>
        <i className="dot boundary" />
        boundary
      </span>
      <span>
        <i className="dot free" />
        free
      </span>
      {higherOrder ? (
        <span>
          <i className="dot free small" />
          midside / center
        </span>
      ) : null}
    </span>
  )
}

export function InteractiveMeshView({
  mesh,
  selectedElementId,
  onSelectElement,
  compact = false,
}: {
  mesh: Mesh
  selectedElementId: number
  onSelectElement: (elementId: number) => void
  compact?: boolean
}) {
  const [hoveredId, setHoveredId] = React.useState<number | null>(null)
  const [showNodes, setShowNodes] = React.useState(!compact)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement | null>(null)
  const lastPointer = React.useRef({ x: 0, y: 0 })
  const size = compact ? 260 : 420

  const positionTooltip = React.useCallback(() => {
    const wrapper = wrapperRef.current
    const tooltip = tooltipRef.current
    if (!wrapper || !tooltip) {
      return
    }
    const rect = wrapper.getBoundingClientRect()
    const { x, y } = lastPointer.current
    tooltip.style.left = `${x + 14}px`
    tooltip.style.top = `${y + 12}px`
    const flipX = x > rect.width * 0.55 ? 'translateX(calc(-100% - 26px))' : ''
    const flipY = y > rect.height * 0.7 ? 'translateY(calc(-100% - 22px))' : ''
    tooltip.style.transform = `${flipX} ${flipY}`.trim()
  }, [])

  // The tooltip mounts one commit after the first pointer move sets hoveredId,
  // so its position must be (re)applied once it exists.
  React.useLayoutEffect(() => {
    if (hoveredId != null) {
      positionTooltip()
    }
  }, [hoveredId, positionTooltip])

  const elementIdFromEvent = (event: React.SyntheticEvent): number | null => {
    const raw = (event.target as SVGElement).dataset?.elementId
    return raw == null ? null : Number(raw)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const wrapper = wrapperRef.current
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect()
      lastPointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    setHoveredId(elementIdFromEvent(event))
    positionTooltip()
  }

  const handleClick = (event: React.MouseEvent) => {
    const elementId = elementIdFromEvent(event)
    if (elementId != null) {
      onSelectElement(elementId)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const maxId = mesh.elements.length - 1
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onSelectElement(Math.min(selectedElementId + 1, maxId))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onSelectElement(Math.max(selectedElementId - 1, 0))
    }
  }

  const hoveredElement = hoveredId != null ? mesh.elements[hoveredId] : undefined
  const cornerCount = referenceCornerCount(mesh.elementKind)
  const hoveredCorners = hoveredElement ? hoveredElement.nodeIds.slice(0, cornerCount) : []
  const hoveredHigher = hoveredElement ? hoveredElement.nodeIds.slice(cornerCount) : []
  const hoveredCentroid = hoveredElement
    ? hoveredCorners.reduce(
        (acc, id) => ({
          x: acc.x + mesh.nodes[id].point.x / hoveredCorners.length,
          y: acc.y + mesh.nodes[id].point.y / hoveredCorners.length,
        }),
        { x: 0, y: 0 },
      )
    : null

  return (
    <div className={compact ? 'mesh-view compact' : 'mesh-view'} ref={wrapperRef}>
      <div className="mesh-view-toolbar">
        <label className="mesh-toggle">
          <input
            type="checkbox"
            checked={showNodes}
            onChange={(event) => setShowNodes(event.target.checked)}
          />
          Show nodes
        </label>
        {showNodes ? <MeshLegend higherOrder={isQuadraticKind(mesh.elementKind)} /> : null}
      </div>
      <svg
        className="mesh-svg interactive"
        viewBox={`0 0 ${size} ${size}`}
        tabIndex={0}
        aria-label={`Mesh with ${mesh.elements.length} elements; element ${selectedElementId} selected. Click an element or use arrow keys to change the selection.`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredId(null)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <rect x="0" y="0" width={size} height={size} rx={compact ? 18 : 22} />
        <MeshPolygons mesh={mesh} selectedElementId={selectedElementId} size={size} />
        <SelectedOutline mesh={mesh} selectedElementId={selectedElementId} size={size} />
        {showNodes ? <MeshNodesLayer mesh={mesh} size={size} compact={compact} /> : null}
      </svg>
      {hoveredElement && hoveredCentroid ? (
        <div className="mesh-tooltip" ref={tooltipRef}>
          <strong>Element #{hoveredElement.id}</strong> · {elementOrderLabel(mesh.elementKind)}
          <div className="mono">Corners: {hoveredCorners.join(', ')}</div>
          {hoveredHigher.length > 0 ? (
            <div className="mono">Mid/center: {hoveredHigher.join(', ')}</div>
          ) : null}
          <div className="mono">
            Center ≈ ({hoveredCentroid.x.toFixed(3)}, {hoveredCentroid.y.toFixed(3)})
          </div>
        </div>
      ) : null}
    </div>
  )
}
