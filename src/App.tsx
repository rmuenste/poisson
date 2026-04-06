import * as React from 'react'
import './App.css'
import { SimulationPipeline } from './core/pipeline/defaultPipeline.ts'
import type { SimulationConfig } from './core/pipeline/contracts.ts'
import { createDefaultStageRegistry } from './core/stages/defaultStages.ts'
import type { Mesh, Vector2 } from './core/fem/mesh.ts'
import type { ElementFieldSample } from './core/postprocess/postprocess.ts'
import { PlotlySurfacePlot } from './ui/PlotlySurfacePlot.tsx'

const pipeline = new SimulationPipeline(createDefaultStageRegistry())

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
  const effectiveConfig = {
    ...config,
    selectedElementId: clampSelectedElementId(config),
  }
  const snapshot = pipeline.run(effectiveConfig)
  const selectedTrace = snapshot.assemblyStage.trace.selectedElementTrace

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
            <span>Triangles</span>
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
                  <option value="trapezoidal">Trapezoidal</option>
                  <option value="centroid">Centroid</option>
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

          {activeStage === 'problem' ? (
            <ProblemStageView equation={snapshot.problemStage.problem.equation} weakForm={snapshot.problemStage.problem.weakFormText} />
          ) : null}

          {activeStage === 'mesh' ? (
            <MeshStageView
              mesh={snapshot.meshStage.mesh}
              selectedElementId={effectiveConfig.selectedElementId}
              refinementHistory={snapshot.meshStage.refinementHistory}
            />
          ) : null}

          {activeStage === 'space' ? (
            <SpaceStageView
              dofCount={snapshot.spaceStage.space.dofCount}
              constrainedDofs={snapshot.spaceStage.space.constrainedDofs}
              freeDofs={snapshot.spaceStage.space.freeDofs}
              selectedElementId={effectiveConfig.selectedElementId}
              mesh={snapshot.meshStage.mesh}
            />
          ) : null}

          {activeStage === 'quadrature' ? (
            <QuadratureStageView
              title={snapshot.quadratureStage.quadratureRule.title}
              samples={selectedTrace?.quadratureSamples ?? []}
            />
          ) : null}

          {activeStage === 'assembly' ? (
            <AssemblyStageView
              selectedTrace={selectedTrace}
              densePreview={snapshot.assemblyStage.constrainedMatrix}
              mesh={snapshot.meshStage.mesh}
              selectedElementDofs={selectedTrace?.nodeIds ?? undefined}
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

function ProblemStageView({ equation, weakForm }: { equation: string; weakForm: string }) {
  return (
    <section className="panel-card stage-view">
      <h2>Problem definition</h2>
      <p className="math-block">{equation}</p>
      <p>{weakForm}</p>
      <div className="note-grid">
        <article>
          <h3>Prototype choices</h3>
          <ul className="compact-list">
            <li>Unit square geometry.</li>
            <li>Linear triangular basis functions.</li>
            <li>Homogeneous Dirichlet boundary treatment.</li>
            <li>Configurable quadrature with default stage services.</li>
          </ul>
        </article>
        <article>
          <h3>Replaceable services</h3>
          <ul className="compact-list">
            <li>Mesh generator</li>
            <li>Mesh refiner</li>
            <li>Quadrature rule</li>
            <li>Linear solver</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function MeshStageView({
  mesh,
  selectedElementId,
  refinementHistory,
}: {
  mesh: Mesh
  selectedElementId: number
  refinementHistory: Array<{ label: string; divisions: number; nodeCount: number; elementCount: number }>
}) {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <div>
          <h2>Mesh and refinement</h2>
          <p>Structured square triangulation with a dedicated uniform refinement service.</p>
        </div>
        <span className="badge">selected element #{selectedElementId}</span>
      </div>
      <MeshSvg mesh={mesh} selectedElementId={selectedElementId} />
      <div className="table-grid">
        {refinementHistory.map((entry) => (
          <div key={entry.label} className="mini-card">
            <strong>{entry.label}</strong>
            <span>{entry.divisions} x {entry.divisions} cells</span>
            <span>{entry.nodeCount} nodes</span>
            <span>{entry.elementCount} triangles</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SpaceStageView({
  dofCount,
  constrainedDofs,
  freeDofs,
  selectedElementId,
  mesh,
}: {
  dofCount: number
  constrainedDofs: number[]
  freeDofs: number[]
  selectedElementId: number
  mesh: Mesh
}) {
  const element = mesh.elements[selectedElementId]

  return (
    <section className="panel-card stage-view">
      <h2>Finite element space</h2>
      <div className="note-grid">
        <article>
          <h3>P1 basis on the reference triangle</h3>
          <p className="math-block">φ₁ = 1 - ξ - η, φ₂ = ξ, φ₃ = η</p>
          <p className="math-block">∇φ₁ = (-1,-1), ∇φ₂ = (1,0), ∇φ₃ = (0,1)</p>
        </article>
        <article>
          <h3>Global space summary</h3>
          <ul className="compact-list">
            <li>Total DOFs: {dofCount}</li>
            <li>Free DOFs: {freeDofs.length}</li>
            <li>Boundary DOFs: {constrainedDofs.length}</li>
            <li>Selected element DOFs: {element.nodeIds.join(', ')}</li>
          </ul>
        </article>
      </div>
      <div className="note-grid">
        <article>
          <h3>Reference triangle</h3>
          <ReferenceTriangleSvg />
        </article>
        <article>
          <h3>Basis functions on the reference element</h3>
          <BasisFunctionGallery />
        </article>
      </div>
      <p className="small-note">
        Dirichlet nodes stay in the global numbering but are constrained explicitly in the
        constraint stage so users can inspect both the unconstrained and constrained systems.
      </p>
    </section>
  )
}

function QuadratureStageView({
  title,
  samples,
}: {
  title: string
  samples: Array<{
    referencePoint: Vector2
    physicalPoint: Vector2
    weight: number
    shapeValues: number[]
    sourceValue: number
  }>
}) {
  return (
    <section className="panel-card stage-view">
      <h2>Quadrature and local sampling</h2>
      <p>
        Active rule: <strong>{title}</strong>
      </p>
      <div className="quadrature-table">
        <div className="row header">
          <span>Ref point</span>
          <span>Physical point</span>
          <span>Weight</span>
          <span>Shape values</span>
          <span>Source</span>
        </div>
        {samples.map((sample, index) => (
          <div key={index} className="row">
            <span>{formatPoint(sample.referencePoint)}</span>
            <span>{formatPoint(sample.physicalPoint)}</span>
            <span>{formatNumber(sample.weight)}</span>
            <span>{sample.shapeValues.map(formatNumber).join(', ')}</span>
            <span>{formatNumber(sample.sourceValue)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AssemblyStageView({
  selectedTrace,
  densePreview,
  mesh,
  selectedElementDofs,
}: {
  selectedTrace:
    | {
        elementId: number
        nodeIds: [number, number, number]
        area: number
        jacobian: [[number, number], [number, number]]
        determinant: number
        physicalGradients: Vector2[]
        localStiffness: number[][]
        localLoad: number[]
      }
    | undefined
  densePreview: number[][]
  mesh: Mesh
  selectedElementDofs: [number, number, number] | undefined
}) {
  return (
    <section className="panel-card stage-view">
      <h2>Element evaluation and global assembly</h2>
      <p>
        Each triangle produces a <em>local</em> `3 x 3` stiffness matrix and a `3`-entry load
        vector. Assembly inserts those local numbers into the <em>global</em> system using the
        selected element&apos;s global degree-of-freedom ids.
      </p>
      <div className="note-grid">
        <article>
          <h3>Selected element trace</h3>
          {selectedTrace ? (
            <ul className="compact-list">
              <li>Element #{selectedTrace.elementId}</li>
              <li>Node ids: {selectedTrace.nodeIds.join(', ')}</li>
              <li>Area: {formatNumber(selectedTrace.area)}</li>
              <li>det(J): {formatNumber(selectedTrace.determinant)}</li>
              <li>J = {formatMatrix2(selectedTrace.jacobian)}</li>
              <li>
                Physical gradients:{' '}
                {selectedTrace.physicalGradients.map((gradient) => formatPoint(gradient)).join(' | ')}
              </li>
            </ul>
          ) : (
            <p>No trace available for the selected element.</p>
          )}
        </article>
        <article>
          <h3>Local contributions</h3>
          {selectedTrace ? (
            <>
              <p className="small-note">
                For linear triangles, each basis gradient is constant on the element. That
                makes every local stiffness entry
                {' '}
                <code>K_T[i,j] = |T| ∇φ_i · ∇φ_j</code>
                {' '}
                for this Poisson problem.
              </p>
              <p className="small-note">
                The physical gradients come from the reference element through
                {' '}
                <code>∇φ_i = J^(-T) ∇φ̂_i</code>.
                {' '}
                The Jacobian of the selected element is shown in the trace, so the matrix
                entries can be read as “map the reference gradients with <code>J^(-T)</code>,
                then take dot products, then multiply by the element area”.
              </p>
              <FormulaMatrix trace={selectedTrace} />
              <MatrixTable matrix={selectedTrace.localStiffness} />
              <p className="small-note">
                Local load vector: {selectedTrace.localLoad.map(formatNumber).join(', ')}
              </p>
            </>
          ) : null}
        </article>
      </div>
      {selectedElementDofs ? (
        <div className="note-grid">
          <article>
            <h3>Local-to-global mapping</h3>
            <MappingDiagram dofs={selectedElementDofs} />
            <p className="small-note">
              Local row/column `i,j ∈ {'{0,1,2}'}` is added to global position
              `A[dof_i, dof_j]`. For this element the map is:
              {' '}
              `0 → {selectedElementDofs[0]}`, `1 → {selectedElementDofs[1]}`, `2 → {selectedElementDofs[2]}`.
            </p>
          </article>
          <article>
            <h3>What lands in the matrix</h3>
            <p className="math-block">
              A(T)[i,j] = ∫<sub>T</sub> ∇φ<sub>i</sub> · ∇φ<sub>j</sub> dx
            </p>
            <p className="small-note">
              During assembly, the selected triangle does not create a separate matrix block.
              Instead, its local `3 x 3` entries are accumulated into the existing global rows
              and columns indexed by its global DOFs. Neighboring elements touching the same DOF
              add into the same global entries.
            </p>
          </article>
        </div>
      ) : null}
      <div className="note-grid">
        <article>
          <h3>Constrained matrix preview</h3>
          <MatrixTable
            matrix={densePreview.slice(0, 10).map((row) => row.slice(0, 10))}
            highlightedRows={selectedElementDofs ? [...selectedElementDofs] : []}
            highlightedColumns={selectedElementDofs ? [...selectedElementDofs] : []}
          />
          <p className="small-note">
            Highlighted rows and columns correspond to the selected element&apos;s global DOFs.
            Their intersections are exactly where that element&apos;s local stiffness entries are
            added into the global matrix.
          </p>
        </article>
        <article>
          <h3>Sparsity structure</h3>
          <SparsityPlot matrix={densePreview} highlightedDofs={selectedElementDofs ? [...selectedElementDofs] : []} />
          <p className="small-note">
            The highlighted dots mark the selected element&apos;s `3 x 3` contribution pattern
            inside the global sparsity structure. The wider band comes from overlap with
            neighboring elements on the mesh.
          </p>
        </article>
      </div>
      <p className="small-note">
        Boundary conditions are applied after assembly so the app can show the unconstrained
        finite element system and then the constrained linear system separately.
      </p>
      <MeshSvg mesh={mesh} selectedElementId={selectedTrace?.elementId ?? 0} compact />
    </section>
  )
}

function SolveStageView({
  solution,
  centerNodeId,
  centerValue,
}: {
  solution: number[]
  centerNodeId: number
  centerValue: number
}) {
  const preview = solution.slice(0, 12)

  return (
    <section className="panel-card stage-view">
      <h2>Linear solve</h2>
      <p>
        The prototype assembles a sparse matrix but solves the constrained system with a
        dense direct elimination stage. This keeps the algebra structure visible while staying
        robust on small educational meshes.
      </p>
      <div className="note-grid">
        <article>
          <h3>Solution vector preview</h3>
          <ul className="compact-list">
            {preview.map((value, index) => (
              <li key={index}>
                u[{index}] = {formatNumber(value)}
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h3>Reference statistic</h3>
          <ul className="compact-list">
            <li>Nearest node to center: {centerNodeId}</li>
            <li>u(center-nearest node) = {formatNumber(centerValue)}</li>
            <li>All boundary values remain zero after constraint application.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function PostprocessStageView({
  mesh,
  elementSamples,
  minValue,
  maxValue,
}: {
  mesh: Mesh
  elementSamples: ElementFieldSample[]
  minValue: number
  maxValue: number
}) {
  return (
    <section className="panel-card stage-view">
      <h2>Postprocessing</h2>
      <p>
        The final field is visualized per triangle using the average nodal value. Gradient
        samples are constant on each linear element and available for inspection.
      </p>
      <SolutionSvg mesh={mesh} elementSamples={elementSamples} minValue={minValue} maxValue={maxValue} />
      <div className="table-grid">
        {elementSamples.slice(0, 6).map((sample) => (
          <div key={sample.elementId} className="mini-card">
            <strong>Element #{sample.elementId}</strong>
            <span>avg u = {formatNumber(sample.averageValue)}</span>
            <span>∇u = {formatPoint(sample.gradient)}</span>
            <span>centroid = {formatPoint(sample.centroid)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MatrixTable({
  matrix,
  highlightedRows = [],
  highlightedColumns = [],
}: {
  matrix: number[][]
  highlightedRows?: number[]
  highlightedColumns?: number[]
}) {
  const highlightedRowSet = new Set(highlightedRows)
  const highlightedColumnSet = new Set(highlightedColumns)

  return (
    <div className="matrix">
      {matrix.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={highlightedRowSet.has(rowIndex) ? 'matrix-row matrix-row-highlight' : 'matrix-row'}
        >
          {row.map((value, columnIndex) => {
            const isHighlighted =
              highlightedRowSet.has(rowIndex) && highlightedColumnSet.has(columnIndex)
            return (
              <span
                key={columnIndex}
                className={isHighlighted ? 'matrix-cell matrix-cell-hit' : 'matrix-cell'}
              >
                {formatNumber(value)}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MappingDiagram({ dofs }: { dofs: [number, number, number] }) {
  return (
    <div className="mapping-diagram">
      {[0, 1, 2].map((localIndex) => (
        <React.Fragment key={localIndex}>
          <div className="mapping-box local">
            <span>local</span>
            <strong>{localIndex}</strong>
          </div>
          <div className="mapping-arrow" aria-hidden="true">→</div>
          <div className="mapping-box global">
            <span>global DOF</span>
            <strong>{dofs[localIndex]}</strong>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function FormulaMatrix({
  trace,
}: {
  trace: {
    area: number
    jacobian: [[number, number], [number, number]]
    determinant: number
    physicalGradients: Vector2[]
    localStiffness: number[][]
  }
}) {
  const referenceGradients: [Vector2, Vector2, Vector2] = [
    { x: -1, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]

  return (
    <div className="formula-matrix">
      <div className="formula-explainer">
        <span className="formula-symbol">Reference-to-physical map</span>
        <span className="formula-text">
          For vertices x₁, x₂, x₃ of the physical triangle,
          {' '}
          <code>F(ξ,η) = x₁ + J [ξ,η]^T</code>
          {' '}
          with
          {' '}
          <code>J = [x₂ - x₁, x₃ - x₁]</code>.
        </span>
        <span className="formula-text">
          In coordinates,
          {' '}
          <code>
            J = [[x₂-x₁, x₃-x₁],[y₂-y₁, y₃-y₁]]
          </code>.
        </span>
        <span className="formula-text">
          J = {formatMatrix2(trace.jacobian)}, det(J) = {formatNumber(trace.determinant)},
          {' '}
          |T| = {formatNumber(trace.area)}
        </span>
        <span className="formula-text">
          ∇φ̂₁ = ({formatVector(referenceGradients[0])}), ∇φ̂₂ = ({formatVector(referenceGradients[1])}),
          {' '}
          ∇φ̂₃ = ({formatVector(referenceGradients[2])})
        </span>
        <span className="formula-text">
          J^(-T) ∇φ̂₁ = ({formatVector(trace.physicalGradients[0])}), J^(-T) ∇φ̂₂ = ({formatVector(trace.physicalGradients[1])}),
          {' '}
          J^(-T) ∇φ̂₃ = ({formatVector(trace.physicalGradients[2])})
        </span>
      </div>
      {trace.localStiffness.map((row, rowIndex) => (
        <div key={rowIndex} className="formula-row">
          {row.map((value, columnIndex) => (
            <div key={columnIndex} className="formula-cell">
              <span className="formula-symbol">
                K[{rowIndex + 1},{columnIndex + 1}]
              </span>
              <span className="formula-text">
                {formatNumber(trace.area)} · (J^(-T)∇φ̂{rowIndex + 1}) · (J^(-T)∇φ̂{columnIndex + 1})
              </span>
              <span className="formula-text">
                = {formatNumber(trace.area)} · ({formatVector(trace.physicalGradients[rowIndex])})
                · ({formatVector(trace.physicalGradients[columnIndex])})
              </span>
              <strong>{formatNumber(value)}</strong>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ReferenceTriangleSvg() {
  const vertices = [
    { x: 38, y: 242, label: '(0,0)' },
    { x: 242, y: 242, label: '(1,0)' },
    { x: 38, y: 38, label: '(0,1)' },
  ]

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 38,38" className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      {vertices.map((vertex) => (
        <g key={vertex.label}>
          <circle cx={vertex.x} cy={vertex.y} r="5.5" className="reference-node" />
          <text x={vertex.x + 10} y={vertex.y - 8} className="reference-node-label">
            {vertex.label}
          </text>
        </g>
      ))}
      <text x="116" y="168" className="reference-fill-label">T̂</text>
    </svg>
  )
}

function BasisFunctionGallery() {
  const basisDefinitions = [
    {
      name: 'φ₁',
      formula: '1 - ξ - η',
      color: '#cf5a36',
      evaluate: (x: number, y: number) => 1 - x - y,
    },
    {
      name: 'φ₂',
      formula: 'ξ',
      color: '#d8a137',
      evaluate: (x: number, _y: number) => x,
    },
    {
      name: 'φ₃',
      formula: 'η',
      color: '#2f8f83',
      evaluate: (_x: number, y: number) => y,
    },
  ] as const

  return (
    <div className="basis-gallery">
      {basisDefinitions.map((basis) => (
        <div key={basis.name} className="basis-card">
          <div className="basis-heading">
            <strong>{basis.name}</strong>
            <span>{basis.formula}</span>
          </div>
          <PlotlySurfacePlot
            color={basis.color}
            evaluate={basis.evaluate}
            label={basis.name}
          />
        </div>
      ))}
    </div>
  )
}

function MeshSvg({
  mesh,
  selectedElementId,
  compact = false,
}: {
  mesh: Mesh
  selectedElementId: number
  compact?: boolean
}) {
  const width = compact ? 260 : 420
  const height = compact ? 260 : 420

  return (
    <svg className="mesh-svg" viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} rx="22" />
      {mesh.elements.map((element) => {
        const points = element.nodeIds
          .map((id) => projectPoint(mesh.nodes[id].point, width, height))
          .map((point) => `${point.x},${point.y}`)
          .join(' ')

        return (
          <polygon
            key={element.id}
            points={points}
            className={element.id === selectedElementId ? 'triangle selected' : 'triangle'}
          />
        )
      })}
    </svg>
  )
}

function SolutionSvg({
  mesh,
  elementSamples,
  minValue,
  maxValue,
}: {
  mesh: Mesh
  elementSamples: ElementFieldSample[]
  minValue: number
  maxValue: number
}) {
  const width = 460
  const height = 320
  const sampleMap = new Map(elementSamples.map((sample) => [sample.elementId, sample]))

  return (
    <svg className="solution-svg" viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} rx="22" />
      {mesh.elements.map((element) => {
        const sample = sampleMap.get(element.id)
        const color = sample ? colorForValue(sample.averageValue, minValue, maxValue) : '#d7e1ec'
        const points = element.nodeIds
          .map((id) => projectPoint(mesh.nodes[id].point, width, height))
          .map((point) => `${point.x},${point.y}`)
          .join(' ')

        return (
          <polygon
            key={element.id}
            points={points}
            fill={color}
            stroke="rgba(15, 27, 43, 0.3)"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}

function SparsityPlot({
  matrix,
  highlightedDofs = [],
}: {
  matrix: number[][]
  highlightedDofs?: number[]
}) {
  const size = Math.min(matrix.length, 40)
  const plot = matrix.slice(0, size).map((row) => row.slice(0, size))
  const highlighted = new Set(highlightedDofs.filter((dof) => dof < size))

  return (
    <svg className="sparsity-svg" viewBox="0 0 240 240">
      <rect x="0" y="0" width="240" height="240" rx="18" />
      {plot.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) =>
          Math.abs(value) > 1e-12 ? (
            <circle
              key={`${rowIndex}-${columnIndex}`}
              cx={12 + (216 * columnIndex) / Math.max(size - 1, 1)}
              cy={12 + (216 * rowIndex) / Math.max(size - 1, 1)}
              r={highlighted.has(rowIndex) && highlighted.has(columnIndex) ? '4' : '2.2'}
              className={
                highlighted.has(rowIndex) && highlighted.has(columnIndex)
                  ? 'sparsity-hit'
                  : undefined
              }
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

function projectPoint(point: Vector2, width: number, height: number): Vector2 {
  const padding = 24
  return {
    x: padding + point.x * (width - 2 * padding),
    y: height - padding - point.y * (height - 2 * padding),
  }
}

function colorForValue(value: number, minValue: number, maxValue: number): string {
  const t = maxValue - minValue < 1e-12 ? 0.5 : (value - minValue) / (maxValue - minValue)
  const r = Math.round(26 + 200 * t)
  const g = Math.round(87 + 120 * (1 - Math.abs(t - 0.5) * 2))
  const b = Math.round(170 + 50 * (1 - t))
  return `rgb(${r}, ${g}, ${b})`
}

function formatNumber(value: number): string {
  return value.toFixed(4)
}

function formatPoint(point: Vector2): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`
}

function formatMatrix2(matrix: [[number, number], [number, number]]): string {
  return `[[${formatNumber(matrix[0][0])}, ${formatNumber(matrix[0][1])}], [${formatNumber(matrix[1][0])}, ${formatNumber(matrix[1][1])}]]`
}

function formatVector(vector: Vector2): string {
  return `${formatNumber(vector.x)}, ${formatNumber(vector.y)}`
}

function clampSelectedElementId(config: SimulationConfig): number {
  const maxElementId = Math.max(2 * (config.baseDivisions * 2 ** config.refinementLevels) ** 2 - 1, 0)
  return Math.max(0, Math.min(config.selectedElementId, maxElementId))
}

export default App
