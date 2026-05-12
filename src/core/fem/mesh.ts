export type Vector2 = {
  x: number
  y: number
}

export type MeshNode = {
  id: number
  point: Vector2
}

export type ElementKind = 'triangle' | 'quad' | 'triangle-p2' | 'quad-q2'

export type MeshElement = {
  id: number
  nodeIds: number[]
}

export type Mesh = {
  nodes: MeshNode[]
  elements: MeshElement[]
  boundaryNodeIds: Set<number>
  divisions: number
  elementKind: ElementKind
}

export type MeshSummary = {
  label: string
  divisions: number
  nodeCount: number
  elementCount: number
  elementKind: ElementKind
}

export function triangleArea(a: Vector2, b: Vector2, c: Vector2): number {
  return 0.5 * Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
}

export function averagePoint(points: Vector2[]): Vector2 {
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  )

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  }
}

function buildStructuredNodes(divisions: number): {
  nodes: MeshNode[]
  boundaryNodeIds: Set<number>
} {
  const nodes: MeshNode[] = []
  const boundaryNodeIds = new Set<number>()
  const step = 1 / divisions

  for (let j = 0; j <= divisions; j += 1) {
    for (let i = 0; i <= divisions; i += 1) {
      const id = j * (divisions + 1) + i
      const point = { x: i * step, y: j * step }
      nodes.push({ id, point })

      if (i === 0 || j === 0 || i === divisions || j === divisions) {
        boundaryNodeIds.add(id)
      }
    }
  }

  return { nodes, boundaryNodeIds }
}

export function createStructuredTriangularMesh(divisions: number): Mesh {
  const { nodes, boundaryNodeIds } = buildStructuredNodes(divisions)
  const elements: MeshElement[] = []

  let elementId = 0
  for (let j = 0; j < divisions; j += 1) {
    for (let i = 0; i < divisions; i += 1) {
      const lowerLeft = j * (divisions + 1) + i
      const lowerRight = lowerLeft + 1
      const upperLeft = lowerLeft + divisions + 1
      const upperRight = upperLeft + 1

      elements.push({
        id: elementId,
        nodeIds: [lowerLeft, lowerRight, upperRight],
      })
      elementId += 1

      elements.push({
        id: elementId,
        nodeIds: [lowerLeft, upperRight, upperLeft],
      })
      elementId += 1
    }
  }

  return { nodes, elements, boundaryNodeIds, divisions, elementKind: 'triangle' }
}

export function createStructuredQuadMesh(divisions: number): Mesh {
  const { nodes, boundaryNodeIds } = buildStructuredNodes(divisions)
  const elements: MeshElement[] = []

  let elementId = 0
  for (let j = 0; j < divisions; j += 1) {
    for (let i = 0; i < divisions; i += 1) {
      const lowerLeft = j * (divisions + 1) + i
      const lowerRight = lowerLeft + 1
      const upperLeft = lowerLeft + divisions + 1
      const upperRight = upperLeft + 1

      elements.push({
        id: elementId,
        nodeIds: [lowerLeft, lowerRight, upperRight, upperLeft],
      })
      elementId += 1
    }
  }

  return { nodes, elements, boundaryNodeIds, divisions, elementKind: 'quad' }
}

function buildFineStructuredNodes(divisions: number): {
  nodes: MeshNode[]
  boundaryNodeIds: Set<number>
  fine: number
} {
  const fine = divisions * 2
  const nodes: MeshNode[] = []
  const boundaryNodeIds = new Set<number>()
  const step = 1 / fine

  for (let j = 0; j <= fine; j += 1) {
    for (let i = 0; i <= fine; i += 1) {
      const id = j * (fine + 1) + i
      nodes.push({ id, point: { x: i * step, y: j * step } })
      if (i === 0 || j === 0 || i === fine || j === fine) {
        boundaryNodeIds.add(id)
      }
    }
  }

  return { nodes, boundaryNodeIds, fine }
}

export function createStructuredQ2QuadMesh(divisions: number): Mesh {
  const { nodes, boundaryNodeIds, fine } = buildFineStructuredNodes(divisions)
  const stride = fine + 1
  const elements: MeshElement[] = []

  let elementId = 0
  for (let j = 0; j < divisions; j += 1) {
    for (let i = 0; i < divisions; i += 1) {
      const i0 = 2 * i
      const j0 = 2 * j
      const at = (di: number, dj: number) => (j0 + dj) * stride + (i0 + di)
      // Standard 9-node ordering: corners, then edge midpoints, then center.
      // Reference coords: 0=(0,0) 1=(1,0) 2=(1,1) 3=(0,1)
      // 4=(.5,0) 5=(1,.5) 6=(.5,1) 7=(0,.5) 8=(.5,.5)
      elements.push({
        id: elementId,
        nodeIds: [
          at(0, 0),
          at(2, 0),
          at(2, 2),
          at(0, 2),
          at(1, 0),
          at(2, 1),
          at(1, 2),
          at(0, 1),
          at(1, 1),
        ],
      })
      elementId += 1
    }
  }

  return { nodes, elements, boundaryNodeIds, divisions, elementKind: 'quad-q2' }
}

export function createStructuredP2TriangularMesh(divisions: number): Mesh {
  const { nodes, boundaryNodeIds, fine } = buildFineStructuredNodes(divisions)
  const stride = fine + 1
  const elements: MeshElement[] = []

  let elementId = 0
  for (let j = 0; j < divisions; j += 1) {
    for (let i = 0; i < divisions; i += 1) {
      const i0 = 2 * i
      const j0 = 2 * j
      const at = (di: number, dj: number) => (j0 + dj) * stride + (i0 + di)
      // Lower-right triangle: vertices LL, LR, UR; edge mids opposite each vertex.
      // Local 0=LL(0,0), 1=LR(1,0), 2=UR(1,1)
      // Local 3 = mid opposite 0 = mid(LR,UR) = (2,1)
      // Local 4 = mid opposite 1 = mid(LL,UR) = (1,1)
      // Local 5 = mid opposite 2 = mid(LL,LR) = (1,0)
      elements.push({
        id: elementId,
        nodeIds: [at(0, 0), at(2, 0), at(2, 2), at(2, 1), at(1, 1), at(1, 0)],
      })
      elementId += 1

      // Upper-left triangle: vertices LL, UR, UL.
      // Local 0=LL(0,0), 1=UR(2,2), 2=UL(0,2)
      // Local 3 = mid opposite 0 = mid(UR,UL) = (1,2)
      // Local 4 = mid opposite 1 = mid(LL,UL) = (0,1)
      // Local 5 = mid opposite 2 = mid(LL,UR) = (1,1)
      elements.push({
        id: elementId,
        nodeIds: [at(0, 0), at(2, 2), at(0, 2), at(1, 2), at(0, 1), at(1, 1)],
      })
      elementId += 1
    }
  }

  return { nodes, elements, boundaryNodeIds, divisions, elementKind: 'triangle-p2' }
}

export function summarizeMesh(mesh: Mesh, label: string): MeshSummary {
  return {
    label,
    divisions: mesh.divisions,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    elementKind: mesh.elementKind,
  }
}
