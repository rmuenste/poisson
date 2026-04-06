import type { QuadratureKind } from '../quadrature/quadrature.ts'
import type { Vector2 } from '../fem/mesh.ts'

export type QuadratureSampleTrace = {
  referencePoint: Vector2
  physicalPoint: Vector2
  weight: number
  shapeValues: number[]
  sourceValue: number
}

export type ElementComputationTrace = {
  elementId: number
  nodeIds: [number, number, number]
  quadratureKind: QuadratureKind
  jacobian: [[number, number], [number, number]]
  determinant: number
  area: number
  physicalGradients: Vector2[]
  quadratureSamples: QuadratureSampleTrace[]
  localStiffness: number[][]
  localLoad: number[]
}

export type AssemblyTrace = {
  selectedElementTrace?: ElementComputationTrace
  selectedElementId: number
}

export type SolverTrace = {
  residualNorm: number
}

export interface ITraceCollector {
  captureElementTrace(trace: ElementComputationTrace): void
  buildAssemblyTrace(): AssemblyTrace
}

export class SelectedElementTraceCollector implements ITraceCollector {
  private selectedElementTrace?: ElementComputationTrace

  constructor(private readonly selectedElementId: number) {}

  captureElementTrace(trace: ElementComputationTrace): void {
    if (trace.elementId === this.selectedElementId) {
      this.selectedElementTrace = trace
    }
  }

  buildAssemblyTrace(): AssemblyTrace {
    return {
      selectedElementTrace: this.selectedElementTrace,
      selectedElementId: this.selectedElementId,
    }
  }
}
