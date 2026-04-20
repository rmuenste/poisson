import type { ElementKind, Mesh, MeshElement, Vector2 } from './mesh.ts'

export interface IFiniteElement {
  readonly id: string
  readonly kind: ElementKind
  readonly order: number
  readonly localDofCount: number
  shapeFunctions(referencePoint: Vector2): number[]
  referenceGradients(referencePoint: Vector2): Vector2[]
}

export type ElementGeometry = {
  elementId: number
  points: Vector2[]
}

export type JacobianInfo = {
  jacobian: [[number, number], [number, number]]
  determinant: number
  inverseTranspose: [[number, number], [number, number]]
}

export class LinearTriangularElement implements IFiniteElement {
  readonly id = 'p1-triangle'
  readonly kind = 'triangle' as const
  readonly order = 1
  readonly localDofCount = 3

  shapeFunctions(referencePoint: Vector2): number[] {
    const { x, y } = referencePoint
    return [1 - x - y, x, y]
  }

  referenceGradients(_referencePoint: Vector2): Vector2[] {
    return [
      { x: -1, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]
  }
}

export class BilinearQuadrilateralElement implements IFiniteElement {
  readonly id = 'q1-quad'
  readonly kind = 'quad' as const
  readonly order = 1
  readonly localDofCount = 4

  shapeFunctions(referencePoint: Vector2): number[] {
    const { x, y } = referencePoint
    return [(1 - x) * (1 - y), x * (1 - y), x * y, (1 - x) * y]
  }

  referenceGradients(referencePoint: Vector2): Vector2[] {
    const { x, y } = referencePoint
    return [
      { x: -(1 - y), y: -(1 - x) },
      { x: 1 - y, y: -x },
      { x: y, y: x },
      { x: -y, y: 1 - x },
    ]
  }
}

export function referenceCentroid(kind: ElementKind): Vector2 {
  return kind === 'quad' ? { x: 0.5, y: 0.5 } : { x: 1 / 3, y: 1 / 3 }
}

export interface IFiniteElementSpace {
  readonly dofCount: number
  readonly constrainedDofs: number[]
  readonly freeDofs: number[]
  dofsForElement(element: MeshElement): number[]
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

  dofsForElement(element: MeshElement): number[] {
    return [...element.nodeIds]
  }
}

export function createElementGeometry(mesh: Mesh, element: MeshElement): ElementGeometry {
  return {
    elementId: element.id,
    points: element.nodeIds.map((id) => mesh.nodes[id].point),
  }
}

export function mapToPhysicalPoint(
  finiteElement: IFiniteElement,
  geometry: ElementGeometry,
  referencePoint: Vector2,
): Vector2 {
  const shapes = finiteElement.shapeFunctions(referencePoint)
  let x = 0
  let y = 0
  for (let i = 0; i < geometry.points.length; i += 1) {
    x += shapes[i] * geometry.points[i].x
    y += shapes[i] * geometry.points[i].y
  }
  return { x, y }
}

export function computeJacobianAt(
  finiteElement: IFiniteElement,
  geometry: ElementGeometry,
  referencePoint: Vector2,
): JacobianInfo {
  const refGradients = finiteElement.referenceGradients(referencePoint)
  let j00 = 0
  let j01 = 0
  let j10 = 0
  let j11 = 0
  for (let i = 0; i < geometry.points.length; i += 1) {
    const p = geometry.points[i]
    const g = refGradients[i]
    j00 += p.x * g.x
    j01 += p.x * g.y
    j10 += p.y * g.x
    j11 += p.y * g.y
  }
  const determinant = j00 * j11 - j01 * j10
  const inverseTranspose: [[number, number], [number, number]] = [
    [j11 / determinant, -j10 / determinant],
    [-j01 / determinant, j00 / determinant],
  ]
  return {
    jacobian: [
      [j00, j01],
      [j10, j11],
    ],
    determinant,
    inverseTranspose,
  }
}

export function physicalGradientsAt(
  finiteElement: IFiniteElement,
  geometry: ElementGeometry,
  referencePoint: Vector2,
): { gradients: Vector2[]; jacobianInfo: JacobianInfo } {
  const jacobianInfo = computeJacobianAt(finiteElement, geometry, referencePoint)
  const refGradients = finiteElement.referenceGradients(referencePoint)
  const { inverseTranspose } = jacobianInfo
  const gradients = refGradients.map((gradient) => ({
    x: inverseTranspose[0][0] * gradient.x + inverseTranspose[0][1] * gradient.y,
    y: inverseTranspose[1][0] * gradient.x + inverseTranspose[1][1] * gradient.y,
  }))
  return { gradients, jacobianInfo }
}
