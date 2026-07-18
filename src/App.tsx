import * as React from 'react'
import './App.css'
import { SimulationPipeline } from './core/pipeline/defaultPipeline.ts'
import type { SimulationConfig } from './core/pipeline/contracts.ts'
import { createDefaultStageRegistry } from './core/stages/defaultStages.ts'
import type { ElementKind } from './core/fem/mesh.ts'
import { defaultQuadratureFor, quadratureRulesFor } from './core/quadrature/quadrature.ts'
import { elementLabel, formatNumber, quadratureLabel } from './ui/shared.ts'
import { ProblemStageView } from './ui/stages/ProblemStageView.tsx'
import { MeshStageView } from './ui/stages/MeshStageView.tsx'
import { SpaceStageView } from './ui/stages/SpaceStageView.tsx'
import { QuadratureStageView } from './ui/stages/QuadratureStageView.tsx'
import { AssemblyStageView } from './ui/stages/AssemblyStageView.tsx'
import { SolveStageView } from './ui/stages/SolveStageView.tsx'
import { PostprocessStageView } from './ui/stages/PostprocessStageView.tsx'

const pipeline = new SimulationPipeline(createDefaultStageRegistry())

// Above this the dense O(n³) LU (a deliberate teaching choice) makes every
// config change take multiple seconds in the browser.
const LARGE_SOLVE_DOF_THRESHOLD = 1500

const stageOrder = [
  'problem',
  'mesh',
  'space',
  'quadrature',
  'assembly',
  'solve',
  'postprocess',
] as const

type StageKey = (typeof stageOrder)[number]

function App() {
  const [activeStage, setActiveStage] = useStageState()
  const [config, setConfig] = useSimulationConfig()
  // First run with the raw config just to learn the element count for clamping.
  const provisionalSnapshot = pipeline.run({
    ...config,
    selectedElementId: 0,
  })
  const elementCount = provisionalSnapshot.meshStage.mesh.elements.length
  const effectiveConfig = {
    ...config,
    selectedElementId: clampSelectedElementId(config, elementCount),
  }
  const snapshot =
    effectiveConfig.selectedElementId === 0
      ? provisionalSnapshot
      : pipeline.run(effectiveConfig)
  const selectedTrace = snapshot.assemblyStage.trace.selectedElementTrace
  const dofCount = snapshot.spaceStage.space.dofCount

  const handleSelectElement = React.useCallback(
    (elementId: number) =>
      setConfig((current) =>
        current.selectedElementId === elementId
          ? current
          : { ...current, selectedElementId: elementId },
      ),
    [setConfig],
  )

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Finite Elements as an explorable system</p>
          <h1>Poisson FEM Explorer</h1>
          <p className="lede">
            A configurable 2D finite element prototype for <code>-Δu = 1</code> on the
            unit square, designed to expose meshes, basis functions, quadrature,
            assembly, and the linear solve as distinct replaceable stages.
          </p>
        </div>
        <div className="hero-card">
          <div className="metric">
            <span>Unknowns</span>
            <strong>{snapshot.spaceStage.space.dofCount}</strong>
          </div>
          <div className="metric">
            <span>{elementLabel(snapshot.meshStage.mesh.elementKind, true)}</span>
            <strong>{snapshot.meshStage.mesh.elements.length}</strong>
          </div>
          <div className="metric">
            <span>Center value</span>
            <strong>{formatNumber(snapshot.postprocessStage.summary.centerValue)}</strong>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="control-panel">
          <section className="panel-card">
            <h2>Configuration</h2>
            <ControlRow
              label="Base divisions"
              value={String(config.baseDivisions)}
              input={
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={config.baseDivisions}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      baseDivisions: Number(event.target.value),
                    }))
                  }
                />
              }
            />
            <ControlRow
              label="Refinement levels"
              value={String(config.refinementLevels)}
              input={
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={config.refinementLevels}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      refinementLevels: Number(event.target.value),
                    }))
                  }
                />
              }
            />
            <ControlRow
              label="Element type"
              value={elementLabel(config.elementKind, false)}
              input={
                <select
                  value={config.elementKind}
                  onChange={(event) => {
                    const nextKind = event.target.value as ElementKind
                    setConfig((current) => ({
                      ...current,
                      elementKind: nextKind,
                      quadratureKind: defaultQuadratureFor(nextKind),
                      selectedElementId: 0,
                    }))
                  }}
                >
                  <option value="triangle">P1 triangle</option>
                  <option value="quad">Q1 quadrilateral</option>
                  <option value="triangle-p2">P2 triangle</option>
                  <option value="quad-q2">Q2 quadrilateral</option>
                </select>
              }
            />
            <ControlRow
              label="Quadrature"
              value={snapshot.quadratureStage.quadratureRule.title}
              input={
                <select
                  value={config.quadratureKind}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      quadratureKind: event.target.value as SimulationConfig['quadratureKind'],
                    }))
                  }
                >
                  {quadratureRulesFor(config.elementKind).map((kind) => (
                    <option key={kind} value={kind}>
                      {quadratureLabel(kind)}
                    </option>
                  ))}
                </select>
              }
            />
            <ControlRow
              label="Selected element"
              value={String(effectiveConfig.selectedElementId)}
              input={
                <input
                  type="range"
                  min="0"
                  max={Math.max(snapshot.meshStage.mesh.elements.length - 1, 0)}
                  step="1"
                  value={effectiveConfig.selectedElementId}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      selectedElementId: Number(event.target.value),
                    }))
                  }
                />
              }
            />
          </section>

          <section className="panel-card">
            <h2>Pipeline design</h2>
            <ul className="compact-list">
              <li>Each stage is represented by a typed strategy/service.</li>
              <li>The pipeline only coordinates stage execution and data flow.</li>
              <li>Deep traces are captured for one selected element.</li>
              <li>Uniform regular refinement is modeled as a replaceable service.</li>
            </ul>
          </section>

          <section className="panel-card">
            <h2>Stage navigation</h2>
            <div className="stage-list">
              {stageOrder.map((stage) => (
                <button
                  key={stage}
                  className={stage === activeStage ? 'stage-button active' : 'stage-button'}
                  onClick={() => setActiveStage(stage)}
                >
                  {stage}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="workspace">
          <section className="panel-card summary-grid">
            <StatCard label="Free DOFs" value={snapshot.spaceStage.space.freeDofs.length} />
            <StatCard
              label="Boundary DOFs"
              value={snapshot.spaceStage.space.constrainedDofs.length}
            />
            <StatCard
              label="Sparse nonzeros"
              value={snapshot.assemblyStage.sparseMatrix.nonZeroCount()}
            />
            <StatCard
              label="Residual norm"
              value={formatNumber(snapshot.solveStage.trace.residualNorm)}
            />
          </section>

          {dofCount > LARGE_SOLVE_DOF_THRESHOLD ? (
            <p className="solver-warning">
              ⚠ {dofCount.toLocaleString()} unknowns — the intentionally simple dense O(n³)
              solver now dominates each update, so configuration changes may take noticeably
              longer. Reduce divisions or refinement for a snappier experience.
            </p>
          ) : null}

          {activeStage === 'problem' ? (
            <ProblemStageView equation={snapshot.problemStage.problem.equation} weakForm={snapshot.problemStage.problem.weakFormText} />
          ) : null}

          {activeStage === 'mesh' ? (
            <MeshStageView
              mesh={snapshot.meshStage.mesh}
              selectedElementId={effectiveConfig.selectedElementId}
              refinementHistory={snapshot.meshStage.refinementHistory}
              elementKind={snapshot.meshStage.mesh.elementKind}
              onSelectElement={handleSelectElement}
            />
          ) : null}

          {activeStage === 'space' ? (
            <SpaceStageView
              dofCount={snapshot.spaceStage.space.dofCount}
              constrainedDofs={snapshot.spaceStage.space.constrainedDofs}
              freeDofs={snapshot.spaceStage.space.freeDofs}
              selectedElementId={effectiveConfig.selectedElementId}
              mesh={snapshot.meshStage.mesh}
              elementKind={snapshot.meshStage.mesh.elementKind}
            />
          ) : null}

          {activeStage === 'quadrature' ? (
            <QuadratureStageView
              title={snapshot.quadratureStage.quadratureRule.title}
              kind={snapshot.quadratureStage.quadratureRule.id}
              elementKind={snapshot.meshStage.mesh.elementKind}
              samples={selectedTrace?.quadratureSamples ?? []}
            />
          ) : null}

          {activeStage === 'assembly' ? (
            <AssemblyStageView
              selectedTrace={selectedTrace}
              densePreview={snapshot.assemblyStage.constrainedMatrix}
              mesh={snapshot.meshStage.mesh}
              selectedElementDofs={selectedTrace?.nodeIds}
              elementKind={snapshot.meshStage.mesh.elementKind}
              onSelectElement={handleSelectElement}
            />
          ) : null}

          {activeStage === 'solve' ? (
            <SolveStageView
              solution={snapshot.solveStage.solution}
              centerNodeId={snapshot.postprocessStage.summary.centerNodeId}
              centerValue={snapshot.postprocessStage.summary.centerValue}
            />
          ) : null}

          {activeStage === 'postprocess' ? (
            <PostprocessStageView
              mesh={snapshot.meshStage.mesh}
              elementSamples={snapshot.postprocessStage.summary.elementSamples}
              minValue={snapshot.postprocessStage.summary.minValue}
              maxValue={snapshot.postprocessStage.summary.maxValue}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}

function useStageState(): [StageKey, (value: StageKey) => void] {
  return React.useState<StageKey>('problem')
}

function useSimulationConfig(): [
  SimulationConfig,
  React.Dispatch<React.SetStateAction<SimulationConfig>>,
] {
  return React.useState<SimulationConfig>({
    baseDivisions: 4,
    refinementLevels: 0,
    elementKind: 'triangle',
    quadratureKind: 'trapezoidal',
    selectedElementId: 0,
  })
}

function ControlRow({
  label,
  value,
  input,
}: {
  label: string
  value: string
  input: React.ReactNode
}) {
  return (
    <label className="control-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {input}
    </label>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function clampSelectedElementId(config: SimulationConfig, elementCount: number): number {
  const maxElementId = Math.max(elementCount - 1, 0)
  return Math.max(0, Math.min(config.selectedElementId, maxElementId))
}

export default App
