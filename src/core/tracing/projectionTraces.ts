import type { EdgeMesh } from '../projection/edgeMesh.ts'
import type { ProjectionOperators } from '../projection/operators.ts'
import type { ProjectionConfig } from '../projection/projectionStep.ts'

/**
 * One time step of the projection scheme, recorded substep by substep so the UI
 * can show what each of the five stages did. Data only -- no computation here.
 */
export type ProjectionStepTrace = {
  index: number
  time: number
  /** Step 1 -- the intermediate velocity, before the projection. */
  intermediateU: number[]
  intermediateV: number[]
  /** Step 2 -- its discrete divergence, cell by cell, and the defect it forms. */
  divergenceBefore: number[]
  divergenceNormBefore: number
  defect: number[]
  /** Step 3 -- the pressure correction and how well the Poisson solve did. */
  pressureCorrection: number[]
  poissonResidualNorm: number
  /** Step 4 -- the updated pressure. */
  pressure: number[]
  /** Step 5 -- the corrected velocity, and the divergence it is left with. */
  velocityU: number[]
  velocityV: number[]
  divergenceAfter: number[]
  divergenceNormAfter: number
}

export type ProjectionRunTrace = {
  config: ProjectionConfig
  mesh: EdgeMesh
  operators: ProjectionOperators
  steps: ProjectionStepTrace[]
}
