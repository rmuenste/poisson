export type Vector2 = {
  x: number
  y: number
}

export type MeshNode = {
  id: number
  point: Vector2
}

export type TriangleElement = {
  id: number
  nodeIds: [number, number, number]
}

export type Mesh = {
  nodes: MeshNode[]
  elements: TriangleElement[]
  boundaryNodeIds: Set<number>
  divisions: number
}

export type MeshSummary = {
  label: string
  divisions: number
  nodeCount: number
  elementCount: number
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

export function createStructuredTriangularMesh(divisions: number): Mesh {
  const nodes: MeshNode[] = []
  const elements: TriangleElement[] = []
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

  return { nodes, elements, boundaryNodeIds, divisions }
}

export function summarizeMesh(mesh: Mesh, label: string): MeshSummary {
  return {
    label,
    divisions: mesh.divisions,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
  }
}
