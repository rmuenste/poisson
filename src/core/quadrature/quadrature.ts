import type { Vector2 } from '../fem/mesh.ts'

export type QuadratureKind = 'trapezoidal' | 'centroid'

export type QuadraturePoint = {
  point: Vector2
  weight: number
}

export interface IQuadratureRule {
  readonly id: QuadratureKind
  readonly title: string
  points(): QuadraturePoint[]
}

export class TrapezoidalTriangleQuadrature implements IQuadratureRule {
  readonly id = 'trapezoidal' as const
  readonly title = 'Vertex trapezoidal rule'

  points(): QuadraturePoint[] {
    return [
      { point: { x: 0, y: 0 }, weight: 1 / 6 },
      { point: { x: 1, y: 0 }, weight: 1 / 6 },
      { point: { x: 0, y: 1 }, weight: 1 / 6 },
    ]
  }
}

export class CentroidQuadrature implements IQuadratureRule {
  readonly id = 'centroid' as const
  readonly title = 'Centroid rule'

  points(): QuadraturePoint[] {
    return [{ point: { x: 1 / 3, y: 1 / 3 }, weight: 1 / 2 }]
  }
}

export function createQuadratureRule(kind: QuadratureKind): IQuadratureRule {
  switch (kind) {
    case 'trapezoidal':
      return new TrapezoidalTriangleQuadrature()
    case 'centroid':
      return new CentroidQuadrature()
  }
}
