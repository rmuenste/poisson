import type { Vector2 } from '../fem/mesh.ts'

/**
 * A uniform quadrilateral mesh of the unit square with explicit edge topology.
 *
 * The projection example uses the nonconforming rotated bilinear / piecewise
 * constant (Q~1/Q0) pair, so the velocity degrees of freedom live on edges and
 * the pressure degrees of freedom live on cells. The existing Mesh type indexes
 * nodes, not edges, which is why this small structure exists alongside it.
 *
 * Both velocity components live on every edge -- this is not a staggered grid.
 */
export type EdgeOrientation = 'vertical' | 'horizontal'

export type ProjectionEdge = {
  id: number
  orientation: EdgeOrientation
  midpoint: Vector2
  isBoundary: boolean
}

export type ProjectionCell = {
  id: number
  i: number
  j: number
  center: Vector2
  /** Local edge order is [left, right, bottom, top] throughout. */
  edgeIds: [number, number, number, number]
}

export type EdgeMesh = {
  divisions: number
  /** Cell width, equal to the cell height. */
  h: number
  edges: ProjectionEdge[]
  cells: ProjectionCell[]
  /** Edges carrying a no-slip condition; their velocity DOFs are eliminated. */
  boundaryEdgeIds: number[]
  freeEdgeIds: number[]
}

export function createEdgeMesh(divisions: number): EdgeMesh {
  const n = divisions
  const h = 1 / n
  const verticalCount = n * (n + 1)

  // Vertical edges sit at x = i*h and span one cell in y; horizontal edges sit
  // at y = j*h and span one cell in x. Vertical edges are numbered first.
  const verticalId = (i: number, j: number) => j * (n + 1) + i
  const horizontalId = (i: number, j: number) => verticalCount + j * n + i

  const edges: ProjectionEdge[] = []

  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i <= n; i += 1) {
      edges[verticalId(i, j)] = {
        id: verticalId(i, j),
        orientation: 'vertical',
        midpoint: { x: i * h, y: (j + 0.5) * h },
        isBoundary: i === 0 || i === n,
      }
    }
  }

  for (let j = 0; j <= n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      edges[horizontalId(i, j)] = {
        id: horizontalId(i, j),
        orientation: 'horizontal',
        midpoint: { x: (i + 0.5) * h, y: j * h },
        isBoundary: j === 0 || j === n,
      }
    }
  }

  const cells: ProjectionCell[] = []
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      cells.push({
        id: j * n + i,
        i,
        j,
        center: { x: (i + 0.5) * h, y: (j + 0.5) * h },
        edgeIds: [
          verticalId(i, j),
          verticalId(i + 1, j),
          horizontalId(i, j),
          horizontalId(i, j + 1),
        ],
      })
    }
  }

  return {
    divisions: n,
    h,
    edges,
    cells,
    boundaryEdgeIds: edges.filter((edge) => edge.isBoundary).map((edge) => edge.id),
    freeEdgeIds: edges.filter((edge) => !edge.isBoundary).map((edge) => edge.id),
  }
}
