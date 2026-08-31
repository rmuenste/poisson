/**
 * The nonconforming rotated bilinear element Q~1, on the reference square
 * [-1,1]^2. The space is spanned by {1, x, y, x^2 - y^2} and the four degrees of
 * freedom are the values at the edge midpoints, ordered [left, right, bottom,
 * top] to match ProjectionCell.edgeIds.
 */
export const LOCAL_EDGE_COUNT = 4

export function shapeValues(xi: number, eta: number): number[] {
  const q = 0.25 * (xi * xi - eta * eta)
  return [
    0.25 - 0.5 * xi + q, // left,   midpoint (-1, 0)
    0.25 + 0.5 * xi + q, // right,  midpoint ( 1, 0)
    0.25 - 0.5 * eta - q, // bottom, midpoint ( 0,-1)
    0.25 + 0.5 * eta - q, // top,    midpoint ( 0, 1)
  ]
}

/** Gradients with respect to the reference coordinates. */
export function shapeGradients(xi: number, eta: number): Array<[number, number]> {
  return [
    [-0.5 + 0.5 * xi, -0.5 * eta],
    [0.5 + 0.5 * xi, -0.5 * eta],
    [-0.5 * xi, -0.5 + 0.5 * eta],
    [-0.5 * xi, 0.5 + 0.5 * eta],
  ]
}

/**
 * Tensor-product Gauss rule on [-1,1]^2. Three points per direction integrate
 * the quadratic shape functions and their products exactly.
 */
const GAUSS_1D = [
  { point: -Math.sqrt(3 / 5), weight: 5 / 9 },
  { point: 0, weight: 8 / 9 },
  { point: Math.sqrt(3 / 5), weight: 5 / 9 },
]

export type ReferenceSample = { xi: number; eta: number; weight: number }

export const referenceQuadrature: ReferenceSample[] = GAUSS_1D.flatMap((a) =>
  GAUSS_1D.map((b) => ({ xi: a.point, eta: b.point, weight: a.weight * b.weight })),
)
