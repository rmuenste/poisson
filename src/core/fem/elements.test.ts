import { describe, expect, it } from 'vitest'
import {
  BilinearQuadrilateralElement,
  BiquadraticQuadrilateralElement,
  LinearTriangularElement,
  QuadraticTriangularElement,
  type IFiniteElement,
} from './elements.ts'
import type { Vector2 } from './mesh.ts'

const REFERENCE_NODES: Record<string, Vector2[]> = {
  'p1-triangle': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  'q1-quad': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  'q2-quad': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ],
  'p2-triangle': [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 0.5, y: 0.5 },
    { x: 0, y: 0.5 },
    { x: 0.5, y: 0 },
  ],
}

const ELEMENTS: IFiniteElement[] = [
  new LinearTriangularElement(),
  new BilinearQuadrilateralElement(),
  new BiquadraticQuadrilateralElement(),
  new QuadraticTriangularElement(),
]

function samplePoints(element: IFiniteElement): Vector2[] {
  const points: Vector2[] = []
  for (let i = 0; i <= 4; i += 1) {
    for (let j = 0; j <= 4; j += 1) {
      const x = i / 4
      const y = j / 4
      if (element.kind === 'triangle' || element.kind === 'triangle-p2') {
        if (x + y > 1 + 1e-12) continue
      }
      points.push({ x, y })
    }
  }
  return points
}

describe.each(ELEMENTS)('$id', (element) => {
  const nodes = REFERENCE_NODES[element.id]

  it('has one reference node per local dof', () => {
    expect(nodes).toHaveLength(element.localDofCount)
  })

  it('shape functions satisfy the Kronecker delta property', () => {
    nodes.forEach((node, i) => {
      const values = element.shapeFunctions(node)
      values.forEach((value, j) => {
        expect(value).toBeCloseTo(i === j ? 1 : 0, 10)
      })
    })
  })

  it('shape functions form a partition of unity', () => {
    for (const point of samplePoints(element)) {
      const sum = element.shapeFunctions(point).reduce((acc, v) => acc + v, 0)
      expect(sum).toBeCloseTo(1, 10)
    }
  })

  it('reference gradients sum to zero (derivative of partition of unity)', () => {
    for (const point of samplePoints(element)) {
      const gradients = element.referenceGradients(point)
      const gx = gradients.reduce((acc, g) => acc + g.x, 0)
      const gy = gradients.reduce((acc, g) => acc + g.y, 0)
      expect(gx).toBeCloseTo(0, 10)
      expect(gy).toBeCloseTo(0, 10)
    }
  })

  it('reference gradients match finite differences of the shape functions', () => {
    const h = 1e-6
    for (const point of [{ x: 0.3, y: 0.25 }, { x: 0.1, y: 0.55 }]) {
      const gradients = element.referenceGradients(point)
      const fx1 = element.shapeFunctions({ x: point.x + h, y: point.y })
      const fx0 = element.shapeFunctions({ x: point.x - h, y: point.y })
      const fy1 = element.shapeFunctions({ x: point.x, y: point.y + h })
      const fy0 = element.shapeFunctions({ x: point.x, y: point.y - h })
      gradients.forEach((gradient, i) => {
        expect(gradient.x).toBeCloseTo((fx1[i] - fx0[i]) / (2 * h), 5)
        expect(gradient.y).toBeCloseTo((fy1[i] - fy0[i]) / (2 * h), 5)
      })
    }
  })
})
