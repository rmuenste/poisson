import type {
  DenseDirectSolver,
  IConstraintHandler,
  ILinearSolver,
  SparseMatrix,
} from '../algebra/linearAlgebra.ts'
import type { IProblemDefinition } from '../domain/problem.ts'
import type { IFiniteElement, IFiniteElementSpace } from '../fem/elements.ts'
import type { ElementKind, Mesh, MeshSummary } from '../fem/mesh.ts'
import type { WeakForm } from '../fem/weakForm.ts'
import type { SolutionSummary } from '../postprocess/postprocess.ts'
import type { QuadratureKind, IQuadratureRule } from '../quadrature/quadrature.ts'
import type { AssemblyTrace, SolverTrace } from '../tracing/traces.ts'

export type SimulationConfig = {
  baseDivisions: number
  refinementLevels: number
  elementKind: ElementKind
  quadratureKind: QuadratureKind
  selectedElementId: number
}

export type ProblemStageResult = {
  problem: IProblemDefinition
}

export type MeshStageResult = {
  baseMesh: Mesh
  mesh: Mesh
  refinementHistory: MeshSummary[]
}

export type SpaceStageResult = {
  finiteElement: IFiniteElement
  space: IFiniteElementSpace
}

export type QuadratureStageResult = {
  quadratureRule: IQuadratureRule
}

export type WeakFormStageResult = {
  weakForm: WeakForm
}

export type AssemblyStageResult = {
  sparseMatrix: SparseMatrix
  rhs: number[]
  constrainedMatrix: number[][]
  constrainedRhs: number[]
  trace: AssemblyTrace
}

export type SolveStageResult = {
  solution: number[]
  solver: ILinearSolver
  trace: SolverTrace
}

export type PostprocessStageResult = {
  summary: SolutionSummary
}

export type SimulationSnapshot = {
  config: SimulationConfig
  problemStage: ProblemStageResult
  meshStage: MeshStageResult
  spaceStage: SpaceStageResult
  quadratureStage: QuadratureStageResult
  weakFormStage: WeakFormStageResult
  assemblyStage: AssemblyStageResult
  solveStage: SolveStageResult
  postprocessStage: PostprocessStageResult
}

export interface ISimulationStage<TInput, TOutput> {
  readonly id: string
  run(input: TInput): TOutput
}

export interface IProblemSetupStage extends ISimulationStage<SimulationConfig, ProblemStageResult> {}

export interface IMeshGenerationStage
  extends ISimulationStage<{ config: SimulationConfig; problem: IProblemDefinition }, Mesh> {}

export interface IMeshRefiner extends ISimulationStage<{ mesh: Mesh }, Mesh> {
  readonly label: string
}

export interface IMeshRefinementStage
  extends ISimulationStage<{ baseMesh: Mesh; config: SimulationConfig }, MeshStageResult> {}

export interface IFiniteElementSpaceStage
  extends ISimulationStage<{ mesh: Mesh }, SpaceStageResult> {}

export interface IQuadratureStage extends ISimulationStage<SimulationConfig, QuadratureStageResult> {}

export interface IWeakFormStage extends ISimulationStage<SimulationConfig, WeakFormStageResult> {}

export interface IAssemblyStage
  extends ISimulationStage<
    {
      config: SimulationConfig
      problem: IProblemDefinition
      mesh: Mesh
      finiteElement: IFiniteElement
      space: IFiniteElementSpace
      quadratureRule: IQuadratureRule
      weakForm: WeakForm
    },
    AssemblyStageResult
  > {}

export interface ISolveStage
  extends ISimulationStage<
    {
      matrix: number[][]
      rhs: number[]
      defaultSolver: DenseDirectSolver
    },
    SolveStageResult
  > {}

export interface IPostprocessStage
  extends ISimulationStage<
    {
      mesh: Mesh
      finiteElement: IFiniteElement
      solution: number[]
    },
    PostprocessStageResult
  > {}

export type StageRegistry = {
  problemSetup: IProblemSetupStage
  meshGeneration: IMeshGenerationStage
  meshRefinement: IMeshRefinementStage
  finiteElementSpace: IFiniteElementSpaceStage
  quadrature: IQuadratureStage
  weakForm: IWeakFormStage
  assembly: IAssemblyStage
  solver: ISolveStage
  postprocess: IPostprocessStage
  constraintHandler: IConstraintHandler
  defaultSolver: DenseDirectSolver
}
