import type { Vector2 } from '../fem/mesh.ts'
import type { EdgeMesh } from './edgeMesh.ts'
import {
  LOCAL_EDGE_COUNT,
  referenceQuadrature,
  shapeGradients,
  shapeValues,
} from './rotatedBilinear.ts'

/**
 * The matrices of the discrete Stokes system on the Q~1/Q0 pair.
 *
 * All of them are assembled by the same element loop the Poisson topic uses:
 * map the reference square onto a cell, evaluate at the quadrature points,
 * scatter into the global matrix. Nothing here is specific to the projection
 * scheme -- the scheme only decides how they are combined.
 */
export type ProjectionOperators = {
  /** Consistent velocity mass matrix, one scalar component. */
  mass: number[][]
  /** Lumped velocity mass matrix, stored as its diagonal. */
  lumpedMass: number[]
  /** Velocity stiffness matrix (discrete Laplacian), one scalar component. */
  stiffness: number[][]
  /** Divergence matrix rows: divergenceX[cell][edge], divergenceY[cell][edge]. */
  divergenceX: number[][]
  divergenceY: number[][]
  /** Pressure mass matrix diagonal -- the cell areas, since pressure is Q0. */
  pressureMass: number[]
  /** The reactive preconditioner P = B^T Ml^-1 B, with no-slip DOFs removed. */
  pressurePoisson: number[][]
}

function zeros(rows: number, columns: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0))
}

export function assembleOperators(mesh: EdgeMesh): ProjectionOperators {
  const edgeCount = mesh.edges.length
  const cellCount = mesh.cells.length
  const { h } = mesh

  const mass = zeros(edgeCount, edgeCount)
  const lumpedMass = Array.from({ length: edgeCount }, () => 0)
  const stiffness = zeros(edgeCount, edgeCount)
  const divergenceX = zeros(cellCount, edgeCount)
  const divergenceY = zeros(cellCount, edgeCount)

  // Reference square [-1,1]^2 -> cell of width h: the Jacobian is h/2 in each
  // direction, so gradients scale by 2/h and the area element by (h/2)^2.
  const detJ = (h / 2) * (h / 2)
  const gradScale = 2 / h

  for (const cell of mesh.cells) {
    for (const sample of referenceQuadrature) {
      const values = shapeValues(sample.xi, sample.eta)
      const gradients = shapeGradients(sample.xi, sample.eta)
      const weight = sample.weight * detJ

      for (let a = 0; a < LOCAL_EDGE_COUNT; a += 1) {
        const rowEdge = cell.edgeIds[a]
        const gradA: Vector2 = {
          x: gradients[a][0] * gradScale,
          y: gradients[a][1] * gradScale,
        }

        divergenceX[cell.id][rowEdge] += weight * gradA.x
        divergenceY[cell.id][rowEdge] += weight * gradA.y

        for (let b = 0; b < LOCAL_EDGE_COUNT; b += 1) {
          const columnEdge = cell.edgeIds[b]
          const gradB: Vector2 = {
            x: gradients[b][0] * gradScale,
            y: gradients[b][1] * gradScale,
          }

          mass[rowEdge][columnEdge] += weight * values[a] * values[b]
          stiffness[rowEdge][columnEdge] += weight * (gradA.x * gradB.x + gradA.y * gradB.y)
        }
      }
    }

    // Lumping by the quadrature rule whose points are the degrees of freedom:
    // the edge-midpoint rule, each point carrying a quarter of the cell area.
    for (let a = 0; a < LOCAL_EDGE_COUNT; a += 1) {
      lumpedMass[cell.edgeIds[a]] += (h * h) / 4
    }
  }

  const pressureMass = mesh.cells.map(() => h * h)

  return {
    mass,
    lumpedMass,
    stiffness,
    divergenceX,
    divergenceY,
    pressureMass,
    pressurePoisson: buildPressurePoisson(mesh, { divergenceX, divergenceY, lumpedMass }),
  }
}

/**
 * P = B^T Ml^-1 B, assembled explicitly rather than applied as three successive
 * products -- the choice Turek argues for, and the one FEATFLOW makes (it
 * announces the matrix as "[B{T} MRho{-1} B]" while building it).
 *
 * Velocity DOFs carrying a no-slip condition contribute nothing, exactly as
 * FEATFLOW's Get_CMat zeroes the 1/M factor for constrained DOFs. With every
 * boundary edge constrained, what remains is the pressure Laplacian with
 * natural (Neumann) boundary conditions -- singular, with the constants in its
 * null space. The projection step pins that constant away.
 */
function buildPressurePoisson(
  mesh: EdgeMesh,
  parts: { divergenceX: number[][]; divergenceY: number[][]; lumpedMass: number[] },
): number[][] {
  const cellCount = mesh.cells.length
  const result = zeros(cellCount, cellCount)
  const free = mesh.freeEdgeIds

  for (let row = 0; row < cellCount; row += 1) {
    for (let column = 0; column < cellCount; column += 1) {
      let sum = 0
      for (const edge of free) {
        const inverseMass = 1 / parts.lumpedMass[edge]
        sum += parts.divergenceX[row][edge] * inverseMass * parts.divergenceX[column][edge]
        sum += parts.divergenceY[row][edge] * inverseMass * parts.divergenceY[column][edge]
      }
      result[row][column] = sum
    }
  }

  return result
}

/** (B^T u)_T -- the discrete divergence of a velocity field, per cell. */
export function discreteDivergence(
  operators: ProjectionOperators,
  u: number[],
  v: number[],
): number[] {
  return operators.divergenceX.map((rowX, cell) => {
    const rowY = operators.divergenceY[cell]
    let sum = 0
    for (let edge = 0; edge < rowX.length; edge += 1) {
      sum += rowX[edge] * u[edge] + rowY[edge] * v[edge]
    }
    return sum
  })
}

/** (B q)_e for each velocity component -- the discrete pressure gradient. */
export function discreteGradient(
  operators: ProjectionOperators,
  q: number[],
): { x: number[]; y: number[] } {
  const edgeCount = operators.lumpedMass.length
  const x = Array.from({ length: edgeCount }, () => 0)
  const y = Array.from({ length: edgeCount }, () => 0)

  for (let cell = 0; cell < q.length; cell += 1) {
    const rowX = operators.divergenceX[cell]
    const rowY = operators.divergenceY[cell]
    for (let edge = 0; edge < edgeCount; edge += 1) {
      x[edge] += rowX[edge] * q[cell]
      y[edge] += rowY[edge] * q[cell]
    }
  }

  return { x, y }
}

export function euclideanNorm(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))
}
