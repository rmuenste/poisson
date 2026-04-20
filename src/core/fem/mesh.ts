export type Vector2 = {
  x: number
  y: number
}

export type MeshNode = {
  id: number
  point: Vector2
}

export type ElementKind = 'triangle' | 'quad'

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

export function summarizeMesh(mesh: Mesh, label: string): MeshSummary {
  return {
    label,
    divisions: mesh.divisions,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    elementKind: mesh.elementKind,
  }
}
