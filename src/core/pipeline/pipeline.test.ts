import { describe, expect, it } from 'vitest'
import { SimulationPipeline } from './defaultPipeline.ts'
import { createDefaultStageRegistry } from '../stages/defaultStages.ts'
import { defaultQuadratureFor } from '../quadrature/quadrature.ts'
import type { ElementKind } from '../fem/mesh.ts'

// Exact solution of -Δu = 1 on (0,1)² with u = 0 on the boundary, evaluated at
// the center via the double Fourier series
//   u(x,y) = (16/π⁴) Σ_{m,n odd} sin(mπx) sin(nπy) / (m n (m² + n²)).
function exactCenterValue(): number {
  let sum = 0
  for (let m = 1; m < 400; m += 2) {
    for (let n = 1; n < 400; n += 2) {
      const signM = (m - 1) / 2 % 2 === 0 ? 1 : -1
      const signN = (n - 1) / 2 % 2 === 0 ? 1 : -1
      sum += (signM * signN) / (m * n * (m * m + n * n))
    }
  }
  return (16 / Math.PI ** 4) * sum
}

const EXACT_CENTER = exactCenterValue()

function centerError(elementKind: ElementKind, refinementLevels: number): number {
  const pipeline = new SimulationPipeline(createDefaultStageRegistry())
  const snapshot = pipeline.run({
    baseDivisions: 4,
    refinementLevels,
    elementKind,
    quadratureKind: defaultQuadratureFor(elementKind),
    selectedElementId: 0,
  })
  expect(snapshot.solveStage.trace.residualNorm).toBeLessThan(1e-9)
  return Math.abs(snapshot.postprocessStage.summary.centerValue - EXACT_CENTER)
}

it('series reference value matches the known benchmark', () => {
  expect(EXACT_CENTER).toBeCloseTo(0.0736714, 6)
})

describe.each<ElementKind>(['triangle', 'quad', 'triangle-p2', 'quad-q2'])(
  'convergence of %s',
  (elementKind) => {
    it('center value approaches the exact solution under refinement', () => {
      const coarse = centerError(elementKind, 0)
      const fine = centerError(elementKind, 1)
      expect(fine).toBeLessThan(coarse)
      // Nodal error is O(h²) for the linear elements and far smaller for the
      // quadratic ones; both comfortably clear these bounds at 8×8 cells.
      const tolerance = elementKind === 'triangle' || elementKind === 'quad' ? 1e-3 : 1e-4
      expect(fine).toBeLessThan(tolerance)
    })
  },
)
