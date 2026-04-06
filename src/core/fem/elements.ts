import type { Mesh, TriangleElement, Vector2 } from './mesh.ts'

export interface IFiniteElement {
  readonly id: string
  readonly order: number
  readonly localDofCount: number
  shapeFunctions(referencePoint: Vector2): number[]
  referenceGradients(): Vector2[]
}

export type ElementGeometry = {
  elementId: number
  points: [Vector2, Vector2, Vector2]
  jacobian: [[number, number], [number, number]]
  determinant: number
  inverseTranspose: [[number, number], [number, number]]
  area: number
}

export class LinearTriangularElement implements IFiniteElement {
  readonly id = 'p1-triangle'
  readonly order = 1
  readonly localDofCount = 3

  shapeFunctions(referencePoint: Vector2): number[] {
    const { x, y } = referencePoint
    return [1 - x - y, x, y]
  }

  referenceGradients(): Vector2[] {
    return [
      { x: -1, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]
  }
}

export interface IFiniteElementSpace {
  readonly dofCount: number
  readonly constrainedDofs: number[]
  readonly freeDofs: number[]
  dofsForElement(element: TriangleElement): number[]
}

export class FiniteElementSpace implements IFiniteElementSpace {
  readonly dofCount: number
  readonly constrainedDofs: number[]
  readonly freeDofs: number[]

  constructor(mesh: Mesh) {
    this.dofCount = mesh.nodes.length
    this.constrainedDofs = [...mesh.boundaryNodeIds].sort((a, b) => a - b)
    const constrained = new Set(this.constrainedDofs)
    this.freeDofs = mesh.nodes.map((node) => node.id).filter((id) => !constrained.has(id))
  }

  dofsForElement(element: TriangleElement): number[] {
    return [...element.nodeIds]
  }
}

export function createElementGeometry(mesh: Mesh, element: TriangleElement): ElementGeometry {
  const [n0, n1, n2] = element.nodeIds.map((id) => mesh.nodes[id].point) as [Vector2, Vector2, Vector2]
  const jacobian: [[number, number], [number, number]] = [
    [n1.x - n0.x, n2.x - n0.x],
    [n1.y - n0.y, n2.y - n0.y],
  ]
  const determinant = jacobian[0][0] * jacobian[1][1] - jacobian[0][1] * jacobian[1][0]
  const inverseTranspose: [[number, number], [number, number]] = [
    [jacobian[1][1] / determinant, -jacobian[1][0] / determinant],
    [-jacobian[0][1] / determinant, jacobian[0][0] / determinant],
  ]

  return {
    elementId: element.id,
    points: [n0, n1, n2],
    jacobian,
    determinant,
    inverseTranspose,
    area: Math.abs(determinant) / 2,
  }
}

export function mapToPhysicalPoint(geometry: ElementGeometry, referencePoint: Vector2): Vector2 {
  const [origin, p1, p2] = geometry.points
  return {
    x: origin.x + (p1.x - origin.x) * referencePoint.x + (p2.x - origin.x) * referencePoint.y,
    y: origin.y + (p1.y - origin.y) * referencePoint.x + (p2.y - origin.y) * referencePoint.y,
  }
}

export function physicalGradients(
  finiteElement: IFiniteElement,
  geometry: ElementGeometry,
): Vector2[] {
  return finiteElement.referenceGradients().map((gradient) => ({
    x:
      geometry.inverseTranspose[0][0] * gradient.x +
      geometry.inverseTranspose[0][1] * gradient.y,
    y:
      geometry.inverseTranspose[1][0] * gradient.x +
      geometry.inverseTranspose[1][1] * gradient.y,
  }))
}
