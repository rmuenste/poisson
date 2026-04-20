import {
  DenseDirectSolver,
  HomogeneousDirichletConstraintHandler,
  SparseMatrix,
  residualNorm,
} from '../algebra/linearAlgebra.ts'
import { UnitSquarePoissonProblem } from '../domain/problem.ts'
import {
  BilinearQuadrilateralElement,
  createElementGeometry,
  FiniteElementSpace,
  LinearTriangularElement,
  mapToPhysicalPoint,
  physicalGradientsAt,
  referenceCentroid,
} from '../fem/elements.ts'
import {
  createStructuredQuadMesh,
  createStructuredTriangularMesh,
  summarizeMesh,
  type Mesh,
  type MeshSummary,
} from '../fem/mesh.ts'
import { createPoissonWeakForm } from '../fem/weakForm.ts'
import { DefaultPostprocessor } from '../postprocess/postprocess.ts'
import { createQuadratureRule } from '../quadrature/quadrature.ts'
import { SelectedElementTraceCollector } from '../tracing/traces.ts'
import type {
  IAssemblyStage,
  IFiniteElementSpaceStage,
  IMeshGenerationStage,
  IMeshRefinementStage,
  IMeshRefiner,
  IPostprocessStage,
  IProblemSetupStage,
  IQuadratureStage,
  ISolveStage,
  IWeakFormStage,
  MeshStageResult,
  ProblemStageResult,
  QuadratureStageResult,
  SimulationConfig,
  SolveStageResult,
  SpaceStageResult,
  StageRegistry,
  WeakFormStageResult,
} from '../pipeline/contracts.ts'
import type { ElementComputationTrace, QuadratureSampleTrace } from '../tracing/traces.ts'

export class DefaultProblemSetupStage implements IProblemSetupStage {
  readonly id = 'default-problem-setup'

  run(_config: SimulationConfig): ProblemStageResult {
    return {
      problem: new UnitSquarePoissonProblem(),
    }
  }
}

export class StructuredMeshGenerationStage implements IMeshGenerationStage {
  readonly id = 'structured-mesh-generation'

  run({ config }: { config: SimulationConfig }): Mesh {
    return config.elementKind === 'quad'
      ? createStructuredQuadMesh(config.baseDivisions)
      : createStructuredTriangularMesh(config.baseDivisions)
  }
}

export class StructuredUniformRefiner implements IMeshRefiner {
  readonly id = 'structured-uniform-refiner'
  readonly label = 'Uniform regular refinement'

  run({ mesh }: { mesh: Mesh }): Mesh {
    const doubled = mesh.divisions * 2
    return mesh.elementKind === 'quad'
      ? createStructuredQuadMesh(doubled)
      : createStructuredTriangularMesh(doubled)
  }
}

export class MeshRefinementStage implements IMeshRefinementStage {
  readonly id = 'mesh-refinement'

  constructor(private readonly refiner: IMeshRefiner) {}

  run({
    baseMesh,
    config,
  }: {
    baseMesh: Mesh
    config: SimulationConfig
  }): MeshStageResult {
    let currentMesh = baseMesh
    const refinementHistory: MeshSummary[] = [summarizeMesh(baseMesh, 'Base mesh')]

    for (let level = 0; level < config.refinementLevels; level += 1) {
      currentMesh = this.refiner.run({ mesh: currentMesh })
      refinementHistory.push(
        summarizeMesh(currentMesh, `Refinement ${level + 1}: ${this.refiner.label}`),
      )
    }

    return {
      baseMesh,
      mesh: currentMesh,
      refinementHistory,
    }
  }
}

export class FiniteElementSpaceStage implements IFiniteElementSpaceStage {
  readonly id = 'finite-element-space'

  run({ mesh }: { mesh: Mesh }): SpaceStageResult {
    const finiteElement =
      mesh.elementKind === 'quad'
        ? new BilinearQuadrilateralElement()
        : new LinearTriangularElement()
    return {
      finiteElement,
      space: new FiniteElementSpace(mesh),
    }
  }
}

export class QuadratureStage implements IQuadratureStage {
  readonly id = 'quadrature'

  run(config: SimulationConfig): QuadratureStageResult {
    return {
      quadratureRule: createQuadratureRule(config.quadratureKind),
    }
  }
}

export class WeakFormStage implements IWeakFormStage {
  readonly id = 'weak-form'

  run(_config: SimulationConfig): WeakFormStageResult {
    return {
      weakForm: createPoissonWeakForm(),
    }
  }
}

export class AssemblyStage implements IAssemblyStage {
  readonly id = 'assembly'

  constructor(
    private readonly constraintHandler: HomogeneousDirichletConstraintHandler,
  ) {}

  run({
    config,
    problem,
    mesh,
    finiteElement,
    space,
    quadratureRule,
    weakForm,
  }: Parameters<IAssemblyStage['run']>[0]) {
    const sparseMatrix = new SparseMatrix(space.dofCount)
    const rhs = Array.from({ length: space.dofCount }, () => 0)
    const traceCollector = new SelectedElementTraceCollector(config.selectedElementId)
    const centroid = referenceCentroid(finiteElement.kind)

    for (const element of mesh.elements) {
      const geometry = createElementGeometry(mesh, element)
      const localMatrix = Array.from({ length: finiteElement.localDofCount }, () =>
        Array.from({ length: finiteElement.localDofCount }, () => 0),
      )
      const localLoad = Array.from({ length: finiteElement.localDofCount }, () => 0)
      const quadratureSamples: QuadratureSampleTrace[] = []
      let elementArea = 0

      for (const sample of quadratureRule.points()) {
        const { gradients, jacobianInfo } = physicalGradientsAt(
          finiteElement,
          geometry,
          sample.point,
        )
        const physicalPoint = mapToPhysicalPoint(finiteElement, geometry, sample.point)
        const shapeValues = finiteElement.shapeFunctions(sample.point)
        const absDet = Math.abs(jacobianInfo.determinant)
        const integrationWeight = absDet * sample.weight
        const sourceValue = problem.source(physicalPoint)

        elementArea += integrationWeight

        quadratureSamples.push({
          referencePoint: sample.point,
          physicalPoint,
          weight: sample.weight,
          shapeValues,
          sourceValue,
          jacobian: jacobianInfo.jacobian,
          determinant: jacobianInfo.determinant,
          inverseTranspose: jacobianInfo.inverseTranspose,
          physicalGradients: gradients,
        })

        for (let i = 0; i < finiteElement.localDofCount; i += 1) {
          for (let j = 0; j < finiteElement.localDofCount; j += 1) {
            let contribution = 0
            for (const term of weakForm.bilinearTerms) {
              contribution += term.evaluate(gradients[i], gradients[j], physicalPoint)
            }
            localMatrix[i][j] += integrationWeight * contribution
          }

          let loadContribution = 0
          for (const term of weakForm.linearTerms) {
            loadContribution += sourceValue * term.evaluate(shapeValues[i], physicalPoint)
          }
          localLoad[i] += integrationWeight * loadContribution
        }
      }

      const dofs = space.dofsForElement(element)
      for (let i = 0; i < dofs.length; i += 1) {
        rhs[dofs[i]] += localLoad[i]
        for (let j = 0; j < dofs.length; j += 1) {
          sparseMatrix.add(dofs[i], dofs[j], localMatrix[i][j])
        }
      }

      const centroidInfo = physicalGradientsAt(finiteElement, geometry, centroid)
      const trace: ElementComputationTrace = {
        elementId: element.id,
        nodeIds: [...element.nodeIds],
        elementKind: finiteElement.kind,
        quadratureKind: quadratureRule.id,
        jacobian: centroidInfo.jacobianInfo.jacobian,
        determinant: centroidInfo.jacobianInfo.determinant,
        area: elementArea,
        physicalGradients: centroidInfo.gradients,
        quadratureSamples,
        localStiffness: localMatrix,
        localLoad,
      }

      traceCollector.captureElementTrace(trace)
    }

    const constrained = this.constraintHandler.applyHomogeneousDirichlet(
      sparseMatrix,
      rhs,
      space.constrainedDofs,
    )

    return {
      sparseMatrix,
      rhs,
      constrainedMatrix: constrained.matrix,
      constrainedRhs: constrained.rhs,
      trace: traceCollector.buildAssemblyTrace(),
    }
  }
}

export class SolveStage implements ISolveStage {
  readonly id = 'solve'

  run({
    matrix,
    rhs,
    defaultSolver,
  }: Parameters<ISolveStage['run']>[0]): SolveStageResult {
    const solution = defaultSolver.solve(matrix, rhs)
    return {
      solution,
      solver: defaultSolver,
      trace: {
        residualNorm: residualNorm(matrix, rhs, solution),
      },
    }
  }
}

export class PostprocessStage implements IPostprocessStage {
  readonly id = 'postprocess'

  private readonly postprocessor = new DefaultPostprocessor()

  run({ mesh, finiteElement, solution }: Parameters<IPostprocessStage['run']>[0]) {
    return {
      summary: this.postprocessor.summarize(mesh, finiteElement, solution),
    }
  }
}

export function createDefaultStageRegistry(): StageRegistry {
  const constraintHandler = new HomogeneousDirichletConstraintHandler()
  const defaultSolver = new DenseDirectSolver()

  return {
    problemSetup: new DefaultProblemSetupStage(),
    meshGeneration: new StructuredMeshGenerationStage(),
    meshRefinement: new MeshRefinementStage(new StructuredUniformRefiner()),
    finiteElementSpace: new FiniteElementSpaceStage(),
    quadrature: new QuadratureStage(),
    weakForm: new WeakFormStage(),
    assembly: new AssemblyStage(constraintHandler),
    solver: new SolveStage(),
    postprocess: new PostprocessStage(),
    constraintHandler,
    defaultSolver,
  }
}
