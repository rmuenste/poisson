import type { ElementKind, Vector2 } from '../core/fem/mesh.ts'
import type { QuadratureKind } from '../core/quadrature/quadrature.ts'

export function formatNumber(value: number): string {
  return value.toFixed(4)
}

export function formatPoint(point: Vector2): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`
}

export function formatMatrix2(matrix: [[number, number], [number, number]]): string {
  return `[[${formatNumber(matrix[0][0])}, ${formatNumber(matrix[0][1])}], [${formatNumber(matrix[1][0])}, ${formatNumber(matrix[1][1])}]]`
}

export function formatVector(vector: Vector2): string {
  return `${formatNumber(vector.x)}, ${formatNumber(vector.y)}`
}

export function subscript(n: number): string {
  const digits: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' }
  return String(n)
    .split('')
    .map((d) => digits[d] ?? d)
    .join('')
}

export function colorForValue(value: number, minValue: number, maxValue: number): string {
  const t = maxValue - minValue < 1e-12 ? 0.5 : (value - minValue) / (maxValue - minValue)
  const r = Math.round(26 + 200 * t)
  const g = Math.round(87 + 120 * (1 - Math.abs(t - 0.5) * 2))
  const b = Math.round(170 + 50 * (1 - t))
  return `rgb(${r}, ${g}, ${b})`
}

export function elementLabel(kind: ElementKind, plural: boolean): string {
  if (isQuadKind(kind)) return plural ? 'Quadrilaterals' : 'Quadrilateral'
  return plural ? 'Triangles' : 'Triangle'
}

export function isQuadKind(kind: ElementKind): boolean {
  return kind === 'quad' || kind === 'quad-q2'
}

export function isHigherOrder(kind: ElementKind): boolean {
  return kind === 'quad-q2' || kind === 'triangle-p2'
}

export function elementOrderLabel(kind: ElementKind): string {
  switch (kind) {
    case 'triangle':
      return 'P1'
    case 'quad':
      return 'Q1'
    case 'triangle-p2':
      return 'P2'
    case 'quad-q2':
      return 'Q2'
  }
}

export function quadratureLabel(kind: QuadratureKind): string {
  switch (kind) {
    case 'trapezoidal':
      return 'Trapezoidal (vertices)'
    case 'centroid':
      return 'Centroid'
    case 'quad-trapezoidal':
      return 'Trapezoidal (corners)'
    case 'quad-gauss2x2':
      return 'Gauss 2×2'
    case 'quad-gauss3x3':
      return 'Gauss 3×3'
    case 'triangle-gauss3':
      return '3-point degree-2 (triangle)'
  }
}

export const NODE_COLORS: Record<ElementKind, string[]> = {
  quad: ['#cf5a36', '#d8a137', '#2f8f83', '#4a6fa5'],
  triangle: ['#cf5a36', '#d8a137', '#2f8f83'],
  'quad-q2': [
    '#cf5a36',
    '#d8a137',
    '#2f8f83',
    '#4a6fa5',
    '#a23e7c',
    '#6c8c2c',
    '#3b8ec2',
    '#b9542a',
    '#5d3a8b',
  ],
  'triangle-p2': ['#cf5a36', '#d8a137', '#2f8f83', '#a23e7c', '#6c8c2c', '#3b8ec2'],
}

export function referenceNodeCoords(kind: ElementKind): Array<{ xi: number; eta: number }> {
  switch (kind) {
    case 'quad':
      return [
        { xi: 0, eta: 0 },
        { xi: 1, eta: 0 },
        { xi: 1, eta: 1 },
        { xi: 0, eta: 1 },
      ]
    case 'quad-q2':
      return [
        { xi: 0, eta: 0 },
        { xi: 1, eta: 0 },
        { xi: 1, eta: 1 },
        { xi: 0, eta: 1 },
        { xi: 0.5, eta: 0 },
        { xi: 1, eta: 0.5 },
        { xi: 0.5, eta: 1 },
        { xi: 0, eta: 0.5 },
        { xi: 0.5, eta: 0.5 },
      ]
    case 'triangle':
      return [
        { xi: 0, eta: 0 },
        { xi: 1, eta: 0 },
        { xi: 0, eta: 1 },
      ]
    case 'triangle-p2':
      return [
        { xi: 0, eta: 0 },
        { xi: 1, eta: 0 },
        { xi: 0, eta: 1 },
        { xi: 0.5, eta: 0.5 },
        { xi: 0, eta: 0.5 },
        { xi: 0.5, eta: 0 },
      ]
  }
}
