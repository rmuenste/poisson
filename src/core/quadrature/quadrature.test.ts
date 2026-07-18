import { describe, expect, it } from 'vitest'
import {
  createQuadratureRule,
  elementKindOf,
  type QuadratureKind,
} from './quadrature.ts'

const TRIANGLE_AREA = 0.5
const SQUARE_AREA = 1

const ALL_KINDS: QuadratureKind[] = [
  'trapezoidal',
  'centroid',
  'quad-trapezoidal',
  'quad-gauss2x2',
  'quad-gauss3x3',
  'triangle-gauss3',
]

function integrate(kind: QuadratureKind, f: (x: number, y: number) => number): number {
  return createQuadratureRule(kind)
    .points()
    .reduce((acc, sample) => acc + sample.weight * f(sample.point.x, sample.point.y), 0)
}

describe.each(ALL_KINDS)('%s', (kind) => {
  const isTriangle = elementKindOf(kind).startsWith('triangle')
  const referenceArea = isTriangle ? TRIANGLE_AREA : SQUARE_AREA

  it('weights sum to the reference element area', () => {
    expect(integrate(kind, () => 1)).toBeCloseTo(referenceArea, 12)
  })

  it('integrates linear polynomials exactly', () => {
    // ∫ x over the reference triangle = 1/6; over the unit square = 1/2.
    const exact = isTriangle ? 1 / 6 : 1 / 2
    expect(integrate(kind, (x) => x)).toBeCloseTo(exact, 12)
    expect(integrate(kind, (_x, y) => y)).toBeCloseTo(exact, 12)
  })
})

describe('degree of exactness', () => {
  it('2x2 Gauss on the square is exact for bicubics', () => {
    // ∫∫ x³y³ over [0,1]² = 1/16
    expect(integrate('quad-gauss2x2', (x, y) => x ** 3 * y ** 3)).toBeCloseTo(1 / 16, 12)
  })

  it('3x3 Gauss on the square is exact for degree-5 monomials per direction', () => {
    // ∫∫ x⁵y⁵ over [0,1]² = 1/36
    expect(integrate('quad-gauss3x3', (x, y) => x ** 5 * y ** 5)).toBeCloseTo(1 / 36, 12)
  })

  it('3-point triangle rule is exact for quadratics', () => {
    // ∫ x² over the reference triangle = 1/12; ∫ xy = 1/24
    expect(integrate('triangle-gauss3', (x) => x * x)).toBeCloseTo(1 / 12, 12)
    expect(integrate('triangle-gauss3', (x, y) => x * y)).toBeCloseTo(1 / 24, 12)
  })
})
