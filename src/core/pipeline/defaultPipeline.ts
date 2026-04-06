import type { SimulationConfig, SimulationSnapshot, StageRegistry } from './contracts.ts'

export class SimulationPipeline {
  constructor(private readonly stages: StageRegistry) {}

  run(config: SimulationConfig): SimulationSnapshot {
    const problemStage = this.stages.problemSetup.run(config)
    const baseMesh = this.stages.meshGeneration.run({
      config,
      problem: problemStage.problem,
    })
    const meshStage = this.stages.meshRefinement.run({ baseMesh, config })
    const spaceStage = this.stages.finiteElementSpace.run({ mesh: meshStage.mesh })
    const quadratureStage = this.stages.quadrature.run(config)
    const weakFormStage = this.stages.weakForm.run(config)
    const assemblyStage = this.stages.assembly.run({
      config,
      problem: problemStage.problem,
      mesh: meshStage.mesh,
      finiteElement: spaceStage.finiteElement,
      space: spaceStage.space,
      quadratureRule: quadratureStage.quadratureRule,
      weakForm: weakFormStage.weakForm,
    })
    const solveStage = this.stages.solver.run({
      matrix: assemblyStage.constrainedMatrix,
      rhs: assemblyStage.constrainedRhs,
      defaultSolver: this.stages.defaultSolver,
    })
    const postprocessStage = this.stages.postprocess.run({
      mesh: meshStage.mesh,
      finiteElement: spaceStage.finiteElement,
      solution: solveStage.solution,
    })

    return {
      config,
      problemStage,
      meshStage,
      spaceStage,
      quadratureStage,
      weakFormStage,
      assemblyStage,
      solveStage,
      postprocessStage,
    }
  }
}
