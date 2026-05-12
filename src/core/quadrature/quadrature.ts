import type { ElementKind, Vector2 } from '../fem/mesh.ts'

export type QuadratureKind =
  | 'trapezoidal'
  | 'centroid'
  | 'quad-gauss2x2'
  | 'quad-trapezoidal'
  | 'quad-gauss3x3'
  | 'triangle-gauss3'

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

export class QuadGauss3x3Quadrature implements IQuadratureRule {
  readonly id = 'quad-gauss3x3' as const
  readonly title = '3×3 Gauss–Legendre on [0,1]²'
  readonly elementKind = 'quad-q2' as const

  points(): QuadraturePoint[] {
    // 1D Gauss-Legendre on [0,1]: nodes (1 ± sqrt(3/5))/2 with weights 5/18,
    // and centre 1/2 with weight 4/9.
    const half = 0.5
    const offset = Math.sqrt(3 / 5) / 2
    const t: [number, number, number] = [half - offset, half, half + offset]
    const w: [number, number, number] = [5 / 18, 4 / 9, 5 / 18]
    const result: QuadraturePoint[] = []
    for (let j = 0; j < 3; j += 1) {
      for (let i = 0; i < 3; i += 1) {
        result.push({ point: { x: t[i], y: t[j] }, weight: w[i] * w[j] })
      }
    }
    return result
  }
}

export class TriangleGauss3Quadrature implements IQuadratureRule {
  readonly id = 'triangle-gauss3' as const
  readonly title = '3-point degree-2 rule on T̂'
  readonly elementKind = 'triangle-p2' as const

  points(): QuadraturePoint[] {
    // Symmetric edge-midpoint rule on the unit triangle, exact for polynomials
    // of degree ≤ 2 — sufficient for the P2 stiffness/load on affine triangles.
    return [
      { point: { x: 1 / 6, y: 1 / 6 }, weight: 1 / 6 },
      { point: { x: 2 / 3, y: 1 / 6 }, weight: 1 / 6 },
      { point: { x: 1 / 6, y: 2 / 3 }, weight: 1 / 6 },
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
    case 'quad-gauss3x3':
      return 'quad-q2'
    case 'triangle-gauss3':
      return 'triangle-p2'
  }
}

export function quadratureRulesFor(elementKind: ElementKind): QuadratureKind[] {
  switch (elementKind) {
    case 'quad':
      return ['quad-gauss2x2', 'quad-trapezoidal']
    case 'quad-q2':
      return ['quad-gauss3x3']
    case 'triangle':
      return ['trapezoidal', 'centroid']
    case 'triangle-p2':
      return ['triangle-gauss3']
  }
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
    case 'quad-gauss3x3':
      return new QuadGauss3x3Quadrature()
    case 'triangle-gauss3':
      return new TriangleGauss3Quadrature()
  }
}
