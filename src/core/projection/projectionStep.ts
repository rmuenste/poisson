import { DenseDirectSolver } from '../algebra/linearAlgebra.ts'
import type { ProjectionStepTrace, ProjectionRunTrace } from '../tracing/projectionTraces.ts'
import { createEdgeMesh, type EdgeMesh } from './edgeMesh.ts'
import {
  assembleOperators,
  discreteDivergence,
  discreteGradient,
  euclideanNorm,
  type ProjectionOperators,
} from './operators.ts'
import { LOCAL_EDGE_COUNT, referenceQuadrature, shapeValues } from './rotatedBilinear.ts'

export type ProjectionConfig = {
  divisions: number
  viscosity: number
  timeStep: number
  /** theta = 1 backward Euler, theta = 1/2 Crank-Nicolson. */
  theta: number
  /** Whether step 4 adds the diffusive term alpha_D * Mp^-1 * f_p. */
  useDiffusivePreconditioner: boolean
  stepCount: number
}

export const defaultProjectionConfig: ProjectionConfig = {
  divisions: 3,
  viscosity: 0.1,
  timeStep: 0.1,
  theta: 1,
  useDiffusivePreconditioner: false,
  stepCount: 1,
}

/**
 * A blob of forcing pushing to the right in the middle of the closed box. It is
 * deliberately NOT divergence-free: a solenoidal force would be balanced by the
 * viscous term alone, the intermediate velocity would come out divergence-free
 * by itself, and the projection step would have nothing to do -- which makes for
 * a poor demonstration of what the projection step is for.
 */
function bodyForce(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    y: 0,
  }
}

/** Load vector F_e = integral of f . phi_e, one entry per component. */
function assembleLoad(mesh: EdgeMesh, operators: ProjectionOperators): { x: number[]; y: number[] } {
  const edgeCount = operators.lumpedMass.length
  const x = Array.from({ length: edgeCount }, () => 0)
  const y = Array.from({ length: edgeCount }, () => 0)
  const detJ = (mesh.h / 2) * (mesh.h / 2)

  for (const cell of mesh.cells) {
    for (const sample of referenceQuadrature) {
      const values = shapeValues(sample.xi, sample.eta)
      const point = {
        x: cell.center.x + (mesh.h / 2) * sample.xi,
        y: cell.center.y + (mesh.h / 2) * sample.eta,
      }
      const force = bodyForce(point.x, point.y)
      const weight = sample.weight * detJ

      for (let a = 0; a < LOCAL_EDGE_COUNT; a += 1) {
        x[cell.edgeIds[a]] += weight * values[a] * force.x
        y[cell.edgeIds[a]] += weight * values[a] * force.y
      }
    }
  }

  return { x, y }
}

/** Zero out rows and columns of no-slip DOFs, keeping the system symmetric. */
function constrain(matrix: number[][], constrained: Set<number>): number[][] {
  return matrix.map((row, i) =>
    row.map((value, j) => {
      if (constrained.has(i) || constrained.has(j)) {
        return i === j ? 1 : 0
      }
      return value
    }),
  )
}

function constrainVector(values: number[], constrained: Set<number>): number[] {
  return values.map((value, i) => (constrained.has(i) ? 0 : value))
}

function matrixTimesVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0))
}

/**
 * Solve the singular pressure-Poisson system. P has the constants in its null
 * space (natural boundary conditions all round), so one pressure value is
 * pinned and the result is shifted back to zero mean afterwards. Because
 * B*(constant) vanishes on every free edge, the velocity correction is
 * unaffected by which constant is chosen.
 */
function solvePressurePoisson(matrix: number[][], rhs: number[]): number[] {
  const pinned = new Set([0])
  const solver = new DenseDirectSolver()
  const solution = solver.solve(constrain(matrix, pinned), constrainVector(rhs, pinned))
  const mean = solution.reduce((sum, value) => sum + value, 0) / solution.length
  return solution.map((value) => value - mean)
}

export function runProjection(config: ProjectionConfig): ProjectionRunTrace {
  const mesh = createEdgeMesh(config.divisions)
  const operators = assembleOperators(mesh)
  const load = assembleLoad(mesh, operators)
  const constrained = new Set(mesh.boundaryEdgeIds)
  const solver = new DenseDirectSolver()

  const { viscosity: nu, timeStep: k, theta } = config
  const edgeCount = mesh.edges.length

  // S = M + theta*nu*k*L is the same scalar matrix for both velocity
  // components, so each time step needs one factorization and two solves --
  // "one solve per velocity component", exactly as in the algorithm section.
  const implicitOperator = operators.mass.map((row, i) =>
    row.map((value, j) => value + theta * nu * k * operators.stiffness[i][j]),
  )
  // The explicit counterpart, applied to the old velocity on the right side.
  const explicitOperator = operators.mass.map((row, i) =>
    row.map((value, j) => value - (1 - theta) * nu * k * operators.stiffness[i][j]),
  )
  const constrainedImplicit = constrain(implicitOperator, constrained)

  let u = Array.from({ length: edgeCount }, () => 0)
  let v = Array.from({ length: edgeCount }, () => 0)
  let pressure = mesh.cells.map(() => 0)

  const steps: ProjectionStepTrace[] = []

  for (let step = 1; step <= config.stepCount; step += 1) {
    // --- Step 1: intermediate velocity, S*u~ = g - k*B*p^(n-1) --------------
    const gradient = discreteGradient(operators, pressure)
    const explicitU = matrixTimesVector(explicitOperator, u)
    const explicitV = matrixTimesVector(explicitOperator, v)

    const rhsU = explicitU.map((value, e) => value + k * load.x[e] - k * gradient.x[e])
    const rhsV = explicitV.map((value, e) => value + k * load.y[e] - k * gradient.y[e])

    const intermediateU = solver.solve(constrainedImplicit, constrainVector(rhsU, constrained))
    const intermediateV = solver.solve(constrainedImplicit, constrainVector(rhsV, constrained))

    const divergenceBefore = discreteDivergence(operators, intermediateU, intermediateV)

    // --- Step 2: the defect, f_p = (1/k) * B^T * u~ -------------------------
    const defect = divergenceBefore.map((value) => value / k)

    // --- Step 3: the Pressure-Poisson solve, R*q = f_p ----------------------
    const q = solvePressurePoisson(operators.pressurePoisson, defect)
    const poissonResidual = matrixTimesVector(operators.pressurePoisson, q).map(
      (value, cell) => value - defect[cell],
    )

    // --- Step 4: pressure update -------------------------------------------
    // p^n = p^(n-1) + alpha_R*q + alpha_D*Mp^-1*f_p, with alpha_R = alpha = 1
    // and alpha_D = theta*nu*k, the weights the additive preconditioner forces.
    const diffusiveWeight = config.useDiffusivePreconditioner ? theta * nu * k : 0
    const nextPressure = pressure.map(
      (value, cell) =>
        value + q[cell] + (diffusiveWeight * defect[cell]) / operators.pressureMass[cell],
    )

    // --- Step 5: the projection, u^n = u~ - k*Ml^-1*B*q ---------------------
    const correction = discreteGradient(operators, q)
    const nextU = intermediateU.map((value, e) =>
      constrained.has(e) ? 0 : value - (k * correction.x[e]) / operators.lumpedMass[e],
    )
    const nextV = intermediateV.map((value, e) =>
      constrained.has(e) ? 0 : value - (k * correction.y[e]) / operators.lumpedMass[e],
    )

    const divergenceAfter = discreteDivergence(operators, nextU, nextV)

    steps.push({
      index: step,
      time: step * k,
      intermediateU,
      intermediateV,
      divergenceBefore,
      divergenceNormBefore: euclideanNorm(divergenceBefore),
      defect,
      pressureCorrection: q,
      poissonResidualNorm: euclideanNorm(poissonResidual),
      pressure: nextPressure,
      velocityU: nextU,
      velocityV: nextV,
      divergenceAfter,
      divergenceNormAfter: euclideanNorm(divergenceAfter),
    })

    u = nextU
    v = nextV
    pressure = nextPressure
  }

  return { config, mesh, operators, steps }
}
