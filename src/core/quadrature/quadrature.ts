import type { ElementKind, Vector2 } from '../fem/mesh.ts'

export type QuadratureKind =
  | 'trapezoidal'
  | 'centroid'
  | 'quad-gauss2x2'
  | 'quad-trapezoidal'

export type QuadraturePoint = {
  point: Vector2
  weight: number
}

export interface IQuadratureRule {
  readonly id: QuadratureKind
  readonly title: string
  readonly elementKind: ElementKind
  points(): QuadraturePoint[]
}

export class TrapezoidalTriangleQuadrature implements IQuadratureRule {
  readonly id = 'trapezoidal' as const
  readonly title = 'Vertex trapezoidal rule'
  readonly elementKind = 'triangle' as const

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
  readonly elementKind = 'triangle' as const

  points(): QuadraturePoint[] {
    return [{ point: { x: 1 / 3, y: 1 / 3 }, weight: 1 / 2 }]
  }
}

export class QuadTrapezoidalQuadrature implements IQuadratureRule {
  readonly id = 'quad-trapezoidal' as const
  readonly title = 'Vertex trapezoidal rule (square)'
  readonly elementKind = 'quad' as const

  points(): QuadraturePoint[] {
    return [
      { point: { x: 0, y: 0 }, weight: 1 / 4 },
      { point: { x: 1, y: 0 }, weight: 1 / 4 },
      { point: { x: 1, y: 1 }, weight: 1 / 4 },
      { point: { x: 0, y: 1 }, weight: 1 / 4 },
    ]
  }
}

export class QuadGauss2x2Quadrature implements IQuadratureRule {
  readonly id = 'quad-gauss2x2' as const
  readonly title = '2×2 Gauss–Legendre on [0,1]²'
  readonly elementKind = 'quad' as const

  points(): QuadraturePoint[] {
    const offset = 1 / (2 * Math.sqrt(3))
    const a = 0.5 - offset
    const b = 0.5 + offset
    return [
      { point: { x: a, y: a }, weight: 1 / 4 },
      { point: { x: b, y: a }, weight: 1 / 4 },
      { point: { x: b, y: b }, weight: 1 / 4 },
      { point: { x: a, y: b }, weight: 1 / 4 },
    ]
  }
}

export function elementKindOf(kind: QuadratureKind): ElementKind {
  switch (kind) {
    case 'trapezoidal':
    case 'centroid':
      return 'triangle'
    case 'quad-trapezoidal':
    case 'quad-gauss2x2':
      return 'quad'
  }
}

export function quadratureRulesFor(elementKind: ElementKind): QuadratureKind[] {
  return elementKind === 'quad'
    ? ['quad-gauss2x2', 'quad-trapezoidal']
    : ['trapezoidal', 'centroid']
}

export function defaultQuadratureFor(elementKind: ElementKind): QuadratureKind {
  return quadratureRulesFor(elementKind)[0]
}

export function createQuadratureRule(kind: QuadratureKind): IQuadratureRule {
  switch (kind) {
    case 'trapezoidal':
      return new TrapezoidalTriangleQuadrature()
    case 'centroid':
      return new CentroidQuadrature()
    case 'quad-trapezoidal':
      return new QuadTrapezoidalQuadrature()
    case 'quad-gauss2x2':
      return new QuadGauss2x2Quadrature()
  }
}
