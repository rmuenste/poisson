import { describe, expect, it } from 'vitest'
import { createEdgeMesh } from './edgeMesh.ts'
import { assembleOperators, discreteDivergence, euclideanNorm } from './operators.ts'
import { defaultProjectionConfig, runProjection } from './projectionStep.ts'
import { LOCAL_EDGE_COUNT, referenceQuadrature, shapeValues } from './rotatedBilinear.ts'

describe('rotated bilinear element', () => {
  it('is nodal at the edge midpoints', () => {
    const midpoints: Array<[number, number]> = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    midpoints.forEach(([xi, eta], node) => {
      const values = shapeValues(xi, eta)
      values.forEach((value, i) => {
        expect(value).toBeCloseTo(i === node ? 1 : 0, 12)
      })
    })
  })

  it('forms a partition of unity', () => {
    for (const sample of referenceQuadrature) {
      const sum = shapeValues(sample.xi, sample.eta).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 12)
    }
  })
})

describe('operators', () => {
  it('lumps the mass matrix to the row sums of the consistent one', () => {
    // Turek's two routes to a diagonal mass matrix -- quadrature matched to the
    // degrees of freedom, and row-sum lumping -- agree exactly for this element.
    const mesh = createEdgeMesh(3)
    const { mass, lumpedMass } = assembleOperators(mesh)
    mass.forEach((row, i) => {
      const rowSum = row.reduce((a, b) => a + b, 0)
      expect(rowSum).toBeCloseTo(lumpedMass[i], 12)
    })
  })

  it('conserves total area in the lumped mass matrix', () => {
    const mesh = createEdgeMesh(4)
    const { lumpedMass } = assembleOperators(mesh)
    expect(lumpedMass.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('gives the divergence matrix the expected flux entries', () => {
    // For this element the divergence rows reduce to +/- h on the two edges
    // normal to the component, and exactly zero on the other two.
    const mesh = createEdgeMesh(3)
    const { divergenceX, divergenceY } = assembleOperators(mesh)
    for (const cell of mesh.cells) {
      const [left, right, bottom, top] = cell.edgeIds
      expect(divergenceX[cell.id][left]).toBeCloseTo(-mesh.h, 12)
      expect(divergenceX[cell.id][right]).toBeCloseTo(mesh.h, 12)
      expect(divergenceX[cell.id][bottom]).toBeCloseTo(0, 12)
      expect(divergenceY[cell.id][bottom]).toBeCloseTo(-mesh.h, 12)
      expect(divergenceY[cell.id][top]).toBeCloseTo(mesh.h, 12)
      expect(divergenceY[cell.id][left]).toBeCloseTo(0, 12)
    }
  })

  it('collapses P = B^T Ml^-1 B onto the 5-point stencil', () => {
    // The claim made in the pressure-Poisson section, checked numerically: an
    // interior cell sees 8 on the diagonal and -2 from each of its four
    // neighbours, i.e. twice the familiar [4, -1, -1, -1, -1] stencil, and the
    // row sums to zero.
    const mesh = createEdgeMesh(5)
    const { pressurePoisson } = assembleOperators(mesh)
    const n = mesh.divisions
    const interior = mesh.cells.filter(
      (cell) => cell.i > 0 && cell.i < n - 1 && cell.j > 0 && cell.j < n - 1,
    )
    expect(interior.length).toBeGreaterThan(0)

    for (const cell of interior) {
      const row = pressurePoisson[cell.id]
      expect(row[cell.id]).toBeCloseTo(8, 12)
      const neighbours = [cell.id - 1, cell.id + 1, cell.id - n, cell.id + n]
      for (const neighbour of neighbours) {
        expect(row[neighbour]).toBeCloseTo(-2, 12)
      }
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12)
      // Nothing else is coupled: the stencil really has five points.
      const nonZero = row.filter((value) => Math.abs(value) > 1e-12).length
      expect(nonZero).toBe(5)
    }
  })

  it('keeps P symmetric', () => {
    const mesh = createEdgeMesh(4)
    const { pressurePoisson } = assembleOperators(mesh)
    pressurePoisson.forEach((row, i) => {
      row.forEach((value, j) => {
        expect(value).toBeCloseTo(pressurePoisson[j][i], 12)
      })
    })
  })
})

describe('projection step', () => {
  it('leaves the corrected velocity discretely divergence-free', () => {
    // The payoff of section 5: B^T u^n = 0 exactly, not approximately, while
    // the intermediate velocity it started from was not divergence-free.
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4, stepCount: 3 })
    for (const step of run.steps) {
      // Relative, not absolute: the defect must be a real fraction of the
      // velocity scale. A solenoidal body force would leave the intermediate
      // velocity divergence-free already and make this example vacuous.
      const scale =
        euclideanNorm(step.intermediateU) + euclideanNorm(step.intermediateV)
      expect(step.divergenceNormBefore / scale).toBeGreaterThan(0.01)
      expect(step.divergenceNormAfter).toBeLessThan(1e-12)
    }
  })

  it('produces a non-trivial flow and pressure', () => {
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4 })
    const step = run.steps[0]
    expect(euclideanNorm(step.velocityU)).toBeGreaterThan(1e-6)
    expect(euclideanNorm(step.pressure)).toBeGreaterThan(1e-6)
  })

  it('solves the pressure-Poisson system to machine precision', () => {
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4 })
    expect(run.steps[0].poissonResidualNorm).toBeLessThan(1e-10)
  })

  it('normalizes the pressure correction to zero mean', () => {
    // P is singular for an enclosed flow, so the correction is only defined up
    // to a constant; the run pins it and shifts back to zero mean.
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4 })
    const q = run.steps[0].pressureCorrection
    expect(q.reduce((a, b) => a + b, 0) / q.length).toBeCloseTo(0, 12)
  })

  it('stays divergence-free for Crank-Nicolson and with the diffusive term on', () => {
    const run = runProjection({
      ...defaultProjectionConfig,
      divisions: 3,
      theta: 0.5,
      useDiffusivePreconditioner: true,
      stepCount: 2,
    })
    for (const step of run.steps) {
      expect(step.divergenceNormAfter).toBeLessThan(1e-12)
    }
  })

  it('respects the no-slip condition on every boundary edge', () => {
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4 })
    const step = run.steps[0]
    for (const edge of run.mesh.boundaryEdgeIds) {
      expect(step.velocityU[edge]).toBe(0)
      expect(step.velocityV[edge]).toBe(0)
    }
  })

  it('keeps the defect compatible with the singular operator', () => {
    // No-slip walls mean no net flux, so the right hand side is orthogonal to
    // the constant null space -- without which the Poisson solve is unsolvable.
    const mesh = createEdgeMesh(4)
    const operators = assembleOperators(mesh)
    const run = runProjection({ ...defaultProjectionConfig, divisions: 4 })
    const step = run.steps[0]
    const total = step.defect.reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(0, 10)
    expect(discreteDivergence(operators, step.velocityU, step.velocityV).length).toBe(
      mesh.cells.length,
    )
  })
})

describe('mesh', () => {
  it('counts edges and cells correctly', () => {
    const mesh = createEdgeMesh(3)
    expect(mesh.cells).toHaveLength(9)
    expect(mesh.edges).toHaveLength(2 * 3 * 4)
    expect(mesh.boundaryEdgeIds).toHaveLength(4 * 3)
    expect(mesh.freeEdgeIds).toHaveLength(2 * 3 * 4 - 12)
    for (const cell of mesh.cells) {
      expect(cell.edgeIds).toHaveLength(LOCAL_EDGE_COUNT)
    }
  })
})
