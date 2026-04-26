import * as React from 'react'
import './App.css'
import { SimulationPipeline } from './core/pipeline/defaultPipeline.ts'
import type { SimulationConfig } from './core/pipeline/contracts.ts'
import { createDefaultStageRegistry } from './core/stages/defaultStages.ts'
import type { ElementKind, Mesh, Vector2 } from './core/fem/mesh.ts'
import type { ElementFieldSample } from './core/postprocess/postprocess.ts'
import {
  defaultQuadratureFor,
  quadratureRulesFor,
  type QuadratureKind,
} from './core/quadrature/quadrature.ts'
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

          {activeStage === 'problem' ? (
            <ProblemStageView equation={snapshot.problemStage.problem.equation} weakForm={snapshot.problemStage.problem.weakFormText} />
          ) : null}

          {activeStage === 'mesh' ? (
            <MeshStageView
              mesh={snapshot.meshStage.mesh}
              selectedElementId={effectiveConfig.selectedElementId}
              refinementHistory={snapshot.meshStage.refinementHistory}
              elementKind={snapshot.meshStage.mesh.elementKind}
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
            <li>P1 triangle or Q1 quadrilateral basis functions (switchable).</li>
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
  elementKind,
}: {
  mesh: Mesh
  selectedElementId: number
  refinementHistory: Array<{ label: string; divisions: number; nodeCount: number; elementCount: number }>
  elementKind: ElementKind
}) {
  const elementsWord = elementLabel(elementKind, true).toLowerCase()
  const meshDescription =
    elementKind === 'quad'
      ? 'Structured square mesh of bilinear quadrilaterals with a dedicated uniform refinement service.'
      : 'Structured square triangulation with a dedicated uniform refinement service.'
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <div>
          <h2>Mesh and refinement</h2>
          <p>{meshDescription}</p>
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
            <span>{entry.elementCount} {elementsWord}</span>
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
  elementKind,
}: {
  dofCount: number
  constrainedDofs: number[]
  freeDofs: number[]
  selectedElementId: number
  mesh: Mesh
  elementKind: ElementKind
}) {
  const element = mesh.elements[selectedElementId]
  const basisHeading =
    elementKind === 'quad'
      ? 'Q1 basis on the reference square [0,1]²'
      : 'P1 basis on the reference triangle'
  const basisFormulaLines =
    elementKind === 'quad'
      ? [
          'N₁ = (1-ξ)(1-η)',
          'N₂ = ξ(1-η)',
          'N₃ = ξη',
          'N₄ = (1-ξ)η',
          '∇N₁ = (-(1-η), -(1-ξ))',
          '∇N₂ = (1-η, -ξ)',
          '∇N₃ = (η, ξ)',
          '∇N₄ = (-η, 1-ξ)',
        ]
      : [
          'φ₁ = 1 - ξ - η, φ₂ = ξ, φ₃ = η',
          '∇φ₁ = (-1,-1), ∇φ₂ = (1,0), ∇φ₃ = (0,1)',
        ]
  const domainLabel =
    elementKind === 'quad' ? 'Reference square [0,1]²' : 'Reference triangle'
  const dofCountText = element.nodeIds.length

  return (
    <section className="panel-card stage-view">
      <h2>Finite element space</h2>
      <div className="note-grid">
        <article>
          <h3>{basisHeading}</h3>
          {basisFormulaLines.map((line) => (
            <p key={line} className="math-block">{line}</p>
          ))}
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
          <h3>{domainLabel}</h3>
          {elementKind === 'quad' ? <ReferenceSquareSvg /> : <ReferenceTriangleSvg />}
        </article>
        <article>
          <h3>Selected element DOF map</h3>
          <ul className="compact-list">
            <li>Element #{selectedElementId}</li>
            <li>Node ids: {element.nodeIds.join(', ')}</li>
          </ul>
          <p className="small-note">
            Each vertex of the selected element corresponds to one global degree of freedom.
            These {dofCountText} node ids are the local-to-global map used during assembly.
          </p>
        </article>
      </div>
      <article>
        <h3>Element map F: {elementKind === 'quad' ? 'Q̂' : 'T̂'} → K</h3>
        <p className="small-note">
          F maps each reference coordinate (ξ,η) ∈{' '}
          {elementKind === 'quad' ? 'Q̂ = [0,1]²' : 'T̂'}
          {' '}to a physical coordinate (x,y) inside element K.
          Color-matched vertices show the correspondence between reference corners and physical nodes.
          {elementKind === 'quad'
            ? ' The bilinear map F(ξ,η) = Σᵢ Nᵢ(ξ,η)·xᵢ interpolates the four node positions.'
            : ' The affine map F(ξ,η) = x₁ + J·(ξ,η)ᵀ is fully determined by the three vertex positions.'}
        </p>
        <RefToPhysMappingSvg
          elementKind={elementKind}
          mesh={mesh}
          selectedElementId={selectedElementId}
        />
        <p className="small-note" style={{ marginTop: '10px' }}>
          {elementKind === 'quad'
            ? 'The Jacobian J = ∂F/∂(ξ,η) varies with position:'
            : 'The Jacobian J = ∂F/∂(ξ,η) is constant over the element:'}
        </p>
        <p className="math-block" style={{ whiteSpace: 'pre' }}>
          {elementKind === 'quad'
            ? 'J(ξ,η) = [ Σᵢ xᵢ ∂Nᵢ/∂ξ   Σᵢ xᵢ ∂Nᵢ/∂η ]\n         [ Σᵢ yᵢ ∂Nᵢ/∂ξ   Σᵢ yᵢ ∂Nᵢ/∂η ]'
            : 'J = [ x₂-x₁  x₃-x₁ ]\n    [ y₂-y₁  y₃-y₁ ]'}
        </p>
      </article>
      <article>
        <h3>Basis functions on the reference element</h3>
        <BasisFunctionGallery elementKind={elementKind} />
      </article>
      <p className="small-note">
        Dirichlet nodes stay in the global numbering but are constrained explicitly in the
        constraint stage so users can inspect both the unconstrained and constrained systems.
      </p>
    </section>
  )
}

function QuadraturePointsSvg({
  samples,
  elementKind,
}: {
  samples: Array<{ referencePoint: Vector2; weight: number }>
  elementKind: ElementKind
}) {
  const toSvg = (xi: number, eta: number) => ({
    x: 38 + xi * 204,
    y: 242 - eta * 204,
  })
  const domainPoints =
    elementKind === 'quad' ? '38,242 242,242 242,38 38,38' : '38,242 242,242 38,38'
  const domainLabel = elementKind === 'quad' ? 'Q̂' : 'T̂'
  const labelY = elementKind === 'quad' ? 145 : 168

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points={domainPoints} className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      <text x="116" y={labelY} className="reference-fill-label">{domainLabel}</text>
      {samples.map((sample, index) => {
        const pt = toSvg(sample.referencePoint.x, sample.referencePoint.y)
        const { dx, dy } = quadPointLabelOffset(sample.referencePoint.x, sample.referencePoint.y)
        return (
          <g key={index}>
            <circle cx={pt.x} cy={pt.y} r="7" className="quadrature-point" />
            <text x={pt.x + dx} y={pt.y + dy} className="quadrature-point-label">
              q{index + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function quadPointLabelOffset(xi: number, eta: number): { dx: number; dy: number } {
  if (xi > 0.8) return { dx: -22, dy: -10 }   // bottom-right vertex: label to the left
  if (eta > 0.8) return { dx: 10, dy: 20 }    // top-left vertex: label below
  return { dx: 10, dy: -10 }                  // bottom-left or interior: label above-right
}

function formatWeightFraction(weight: number): string {
  if (Math.abs(weight - 1 / 6) < 1e-9) return '1/6'
  if (Math.abs(weight - 1 / 2) < 1e-9) return '1/2'
  if (Math.abs(weight - 1 / 3) < 1e-9) return '1/3'
  if (Math.abs(weight - 1 / 4) < 1e-9) return '1/4'
  if (Math.abs(weight - 1) < 1e-9) return '1'
  return formatNumber(weight)
}

function quadratureExplanationFor(kind: QuadratureKind): string {
  switch (kind) {
    case 'trapezoidal':
      return 'The vertex trapezoidal rule places one point at each vertex of T̂ with equal weight 1/6. It integrates polynomials of degree ≤ 1 exactly. Because ∇φ̂ᵢ · ∇φ̂ⱼ is constant on every linear triangle, stiffness entries are always exact. Load entries ∫ f·φ̂ᵢ are exact when f is at most linear.'
    case 'centroid':
      return 'The centroid rule places a single point at (⅓, ⅓) with weight ½. It also integrates degree ≤ 1 exactly using just one function evaluation, at the cost of resolving less spatial variation within the element.'
    case 'quad-trapezoidal':
      return 'The vertex trapezoidal rule on Q̂ places one point at each corner of [0,1]² with equal weight 1/4. It reproduces bilinear integrands exactly per coordinate direction. Because ∇Nᵢ varies linearly on Q̂, stiffness entries are not generally exact — Gauss 2×2 is the usual choice for Q1.'
    case 'quad-gauss2x2':
      return 'The 2×2 Gauss–Legendre rule on [0,1]² places four points at ξ,η ∈ {½ ∓ 1/(2√3)} with equal weight 1/4. It integrates polynomials of degree ≤ 3 per coordinate direction exactly. Because the Q1 stiffness integrand (∇Nᵢ · ∇Nⱼ) |det J| is at most bicubic on affine quads, stiffness is computed exactly.'
  }
}

function QuadratureStageView({
  title,
  kind,
  elementKind,
  samples,
}: {
  title: string
  kind: QuadratureKind
  elementKind: ElementKind
  samples: Array<{
    referencePoint: Vector2
    physicalPoint: Vector2
    weight: number
    shapeValues: number[]
    sourceValue: number
  }>
}) {
  const weightSum = samples.reduce((sum, s) => sum + s.weight, 0)
  const referenceAreaLabel = elementKind === 'quad' ? 'area(Q̂) = 1' : 'area(T̂) = 1/2'
  const quadratureExplanation = quadratureExplanationFor(kind)

  return (
    <section className="panel-card stage-view">
      <h2>Quadrature and local sampling</h2>
      <p>
        Active rule: <strong>{title}</strong>
      </p>

      <div className="note-grid">
        <article>
          <h3>Approximation formula</h3>
          <p className="small-note">
            Every integral over an element is pulled back to the reference domain
            {' '}
            {elementKind === 'quad' ? 'Q̂ = [0,1]²' : 'T̂'}
            {' '}
            and approximated by a weighted sum. The rule selects a fixed set of
            quadrature points (ξ_q, η_q) with associated weights w_q. For any
            integrand g this gives:
          </p>
          <p className="math-block">
            {'∫_'}{elementKind === 'quad' ? 'Q̂' : 'T̂'}{' g(ξ,η) dξdη ≈ Σ_q w_q · g(ξ_q, η_q)'}
          </p>
          <p className="small-note">
            Applied to both element integrals — where f denotes the source term and
            J the element Jacobian:
          </p>
          <p className="math-block">
            {elementKind === 'quad' ? 'K_E' : 'K_T'}{'[i,j] ≈'}
            {elementKind === 'quad' && <br />}
            {'  Σ_q w_q · (∇φ̂ᵢ · ∇φ̂ⱼ) · |det J|'}
          </p>
          <p className="math-block">
            {elementKind === 'quad' ? 'b_E' : 'b_T'}{'[i] ≈'}
            {elementKind === 'quad' && <br />}
            {'  Σ_q w_q · f(x_q) · φ̂ᵢ(ξ_q) · |det J|'}
          </p>
          <p className="small-note">{quadratureExplanation}</p>
        </article>

        <article>
          <h3>Points on {elementKind === 'quad' ? 'Q̂' : 'T̂'}</h3>
          <QuadraturePointsSvg samples={samples} elementKind={elementKind} />
          <div className="quad-legend">
            {samples.map((s, index) => (
              <div key={index} className="quad-legend-row">
                <span className="quad-dot" />
                <span>q{index + 1}</span>
                <span>({formatNumber(s.referencePoint.x)}, {formatNumber(s.referencePoint.y)})</span>
                <span>w = {formatWeightFraction(s.weight)}</span>
              </div>
            ))}
            <div className="quad-legend-row quad-legend-sum">
              <span />
              <span />
              <span />
              <span>Σ w_q = {formatWeightFraction(weightSum)} = {referenceAreaLabel} ✓</span>
            </div>
          </div>
        </article>
      </div>

      <article>
        <h3>Sample data — selected element</h3>
        <p className="small-note">
          Each physical point x_q = F(ξ_q, η_q) is the image of the reference quadrature point
          under the element map. Shape values φ̂ᵢ(ξ_q) are evaluated at the reference coordinates
          and reused for both{' '}
          {elementKind === 'quad' ? 'K_E and b_E' : 'K_T and b_T'}.
        </p>
        <div className="quadrature-table">
          <div className="row header">
            <span>Ref point (ξ,η)</span>
            <span>Physical point x_q</span>
            <span>Weight w_q</span>
            <span>Shape values φ̂ᵢ(ξ_q)</span>
            <span>f(x_q)</span>
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
          <div className="row quadrature-sum-row">
            <span />
            <span />
            <span>{formatWeightFraction(weightSum)} = {referenceAreaLabel} ✓</span>
            <span />
            <span />
          </div>
        </div>
      </article>
    </section>
  )
}

type AssemblySampleTrace = {
  referencePoint: Vector2
  physicalPoint: Vector2
  weight: number
  shapeValues: number[]
  sourceValue: number
  jacobian: [[number, number], [number, number]]
  determinant: number
  inverseTranspose: [[number, number], [number, number]]
  physicalGradients: Vector2[]
}

type AssemblyElementTrace = {
  elementId: number
  nodeIds: number[]
  area: number
  jacobian: [[number, number], [number, number]]
  determinant: number
  physicalGradients: Vector2[]
  localStiffness: number[][]
  localLoad: number[]
  quadratureSamples: AssemblySampleTrace[]
}

function AssemblyStageView({
  selectedTrace,
  densePreview,
  mesh,
  selectedElementDofs,
  elementKind,
}: {
  selectedTrace: AssemblyElementTrace | undefined
  densePreview: number[][]
  mesh: Mesh
  selectedElementDofs: number[] | undefined
  elementKind: ElementKind
}) {
  const dofCount = selectedElementDofs?.length ?? (elementKind === 'quad' ? 4 : 3)
  const elementNoun = elementLabel(elementKind, false).toLowerCase()
  return (
    <section className="panel-card stage-view">
      <h2>Element evaluation and global assembly</h2>
      <p>
        Each {elementNoun} produces a <em>local</em> {dofCount} × {dofCount} stiffness matrix and a {dofCount}-entry
        load vector. Assembly inserts those local numbers into the <em>global</em> system using
        the selected element&apos;s global degree-of-freedom ids.
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
            elementKind === 'quad' ? (
              <>
                <p className="small-note">
                  For bilinear quadrilaterals, the reference gradients ∇N̂ᵢ(ξ,η) vary with
                  position, so each stiffness entry is a quadrature sum, not a closed form.
                </p>
                <p className="small-note">
                  <code>
                    K_Q[i,j] = Σ_q w_q · |det J(ξ_q)| · (J(ξ_q)^(-T) ∇N̂ᵢ(ξ_q)) · (J(ξ_q)^(-T) ∇N̂ⱼ(ξ_q))
                  </code>
                </p>
                <QuadFormulaMatrix trace={selectedTrace} />
                <MatrixTable matrix={selectedTrace.localStiffness} />
              </>
            ) : (
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
              </>
            )
          ) : null}
        </article>
      </div>
      {selectedElementDofs ? (
        <div className="note-grid">
          <article>
            <h3>Local-to-global mapping</h3>
            <MappingDiagram dofs={selectedElementDofs} />
            <p className="small-note">
              Local row/column `i,j ∈ {'{0..' + (selectedElementDofs.length - 1) + '}'}` is added
              to global position `A[dof_i, dof_j]`. For this element the map is:
              {' '}
              {selectedElementDofs.map((dof, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? ', ' : ''}
                  `{index} → {dof}`
                </React.Fragment>
              ))}.
            </p>
          </article>
          <article>
            <h3>What lands in the matrix</h3>
            <p className="math-block">
              A({elementKind === 'quad' ? 'Q' : 'T'})[i,j] = ∫<sub>{elementKind === 'quad' ? 'Q' : 'T'}</sub> ∇φ<sub>i</sub> · ∇φ<sub>j</sub> dx
            </p>
            <p className="small-note">
              During assembly, the selected {elementNoun} does not create a separate matrix block.
              Instead, its local {dofCount} × {dofCount} entries are accumulated into the existing
              global rows and columns indexed by its global DOFs. Neighboring elements touching
              the same DOF add into the same global entries.
            </p>
          </article>
        </div>
      ) : null}
      <LoadVectorSection
        selectedTrace={selectedTrace}
        selectedElementDofs={selectedElementDofs}
        elementKind={elementKind}
      />
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
            The highlighted dots mark the selected element&apos;s `{dofCount} x {dofCount}` contribution
            pattern inside the global sparsity structure. The wider band comes from overlap with
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
  const elementNoun = elementLabel(mesh.elementKind, false).toLowerCase()
  const gradientNote =
    mesh.elementKind === 'quad'
      ? 'Gradient samples shown below are evaluated at the reference centroid of each element.'
      : 'Gradient samples are constant on each linear element and available for inspection.'
  return (
    <section className="panel-card stage-view">
      <h2>Postprocessing</h2>
      <p>
        The final field is visualized per {elementNoun} using the average nodal value. {gradientNote}
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

function LoadVectorSection({
  selectedTrace,
  selectedElementDofs,
  elementKind,
}: {
  selectedTrace: AssemblyElementTrace | undefined
  selectedElementDofs: number[] | undefined
  elementKind: ElementKind
}) {
  if (!selectedTrace) return null

  const { quadratureSamples, localLoad } = selectedTrace
  const n = localLoad.length
  const basisSymbol = elementKind === 'quad' ? 'N' : 'φ'
  const domainSymbol = elementKind === 'quad' ? 'Q' : 'T'
  const refSymbol = elementKind === 'quad' ? 'Q̂' : 'T̂'
  const refAreaText = elementKind === 'quad' ? '1 (the area of [0,1]²)' : '½ (the area of the reference triangle)'
  const jacobianIsConstant = elementKind !== 'quad'

  const sampleBasisContribution = (q: number, i: number): number => {
    const sample = quadratureSamples[q]
    return sample.weight * Math.abs(sample.determinant) * sample.sourceValue * sample.shapeValues[i]
  }
  const perDofSum = Array.from({ length: n }, (_, i) =>
    quadratureSamples.reduce((sum, _s, qIndex) => sum + sampleBasisContribution(qIndex, i), 0),
  )

  return (
    <div className="note-grid">
      <article>
        <h3>Local load vector</h3>
        <p className="small-note">
          Each entry b_{domainSymbol}[i] is the projection of the source term f onto the local
          basis function {basisSymbol}̂ᵢ, integrated over the element. The integral is pulled
          back to the reference domain via the Jacobian:
        </p>
        <p className="math-block">
          b_{domainSymbol}[i] = ∫_{domainSymbol} f · {basisSymbol}ᵢ dx = ∫_{refSymbol} f(F(ξ,η)) · {basisSymbol}̂ᵢ(ξ,η) · |det J(ξ,η)| dξdη
        </p>
        <p className="math-block">
          ≈ Σ_q w_q · f(x_q) · {basisSymbol}̂ᵢ(ξ_q) · |det J(ξ_q)|
        </p>
        <p className="small-note">
          Here q indexes the quadrature points on the reference domain, ξ_q is the reference
          coordinate of the q-th point, w_q is its weight, and x_q = F(ξ_q) is the physical
          coordinate. The weights satisfy Σ_q w_q = {refAreaText}.
        </p>
        {jacobianIsConstant ? (
          <p className="small-note">
            For P1 triangles |det J| is constant on the element, so it can be pulled out of the sum.
            For this problem f = 1 everywhere, so f(x_q) = 1 at every quadrature point.
          </p>
        ) : (
          <p className="small-note">
            For Q1 quadrilaterals |det J(ξ_q)| generally varies across the element — on the
            structured square mesh it happens to be constant, but the code evaluates it
            per-sample regardless. f(x_q) = 1 at every quadrature point for this problem.
          </p>
        )}
        <div className="load-table">
          <div className="load-table-row load-table-header">
            <span>q</span>
            {Array.from({ length: n }, (_, i) => (
              <span key={i}>w_q · |det J| · f · {basisSymbol}̂{subscript(i + 1)}</span>
            ))}
          </div>
          {quadratureSamples.map((_sample, qIndex) => (
            <div key={qIndex} className="load-table-row">
              <span>{qIndex + 1}</span>
              {Array.from({ length: n }, (_, i) => (
                <span key={i}>{formatNumber(sampleBasisContribution(qIndex, i))}</span>
              ))}
            </div>
          ))}
          <div className="load-table-row load-table-result-row">
            <span>Σ_q</span>
            {perDofSum.map((val, i) => (
              <span key={i} className="load-entry-highlight">{formatNumber(val)}</span>
            ))}
          </div>
        </div>
        <p className="small-note">
          The bottom row is b_{domainSymbol}[i]. For a uniform source f = 1 and a symmetric
          element, all {n} entries are equal: each basis function captures exactly the same
          share of ∫_{domainSymbol} 1 dx = |{domainSymbol}|.
        </p>
      </article>
      <article>
        <h3>RHS accumulation</h3>
        <p className="math-block">F[dof_i] += b_{domainSymbol}[i]</p>
        <p className="small-note">
          The same local-to-global map that scatters K_{domainSymbol} into A also scatters
          b_{domainSymbol} into the global right-hand side vector F. Every element sharing
          DOF k contributes its local load entry into the same slot, so F[k] accumulates to
          ∫_Ω f · {basisSymbol}ₖ dx across all elements.
        </p>
        {selectedElementDofs ? (
          <div className="mapping-diagram">
            {selectedElementDofs.map((globalDof, localIndex) => (
              <React.Fragment key={localIndex}>
                <div className="mapping-box local">
                  <span>b_{domainSymbol}[{localIndex}]</span>
                  <strong>{formatNumber(localLoad[localIndex])}</strong>
                </div>
                <div className="mapping-arrow" aria-hidden="true">→</div>
                <div className="mapping-box global">
                  <span>F[{globalDof}] +=</span>
                  <strong>{formatNumber(localLoad[localIndex])}</strong>
                </div>
              </React.Fragment>
            ))}
          </div>
        ) : null}
        <p className="small-note">
          After all elements are processed, F[k] holds the full integral ∫_Ω f · {basisSymbol}ₖ dx,
          assembled from per-element contributions exactly as the global stiffness matrix was.
        </p>
      </article>
    </div>
  )
}

function subscript(n: number): string {
  const digits: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' }
  return String(n)
    .split('')
    .map((d) => digits[d] ?? d)
    .join('')
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

function MappingDiagram({ dofs }: { dofs: number[] }) {
  return (
    <div className="mapping-diagram">
      {dofs.map((globalDof, localIndex) => (
        <React.Fragment key={localIndex}>
          <div className="mapping-box local">
            <span>local</span>
            <strong>{localIndex}</strong>
          </div>
          <div className="mapping-arrow" aria-hidden="true">→</div>
          <div className="mapping-box global">
            <span>global DOF</span>
            <strong>{globalDof}</strong>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function FormulaMatrix({ trace }: { trace: AssemblyElementTrace }) {
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

function QuadFormulaMatrix({ trace }: { trace: AssemblyElementTrace }) {
  const { quadratureSamples, localStiffness } = trace
  const n = localStiffness.length

  return (
    <div className="formula-matrix">
      <div className="formula-explainer">
        <span className="formula-symbol">Isoparametric map on Q̂ = [0,1]²</span>
        <span className="formula-text">
          <code>F(ξ,η) = Σᵢ Nᵢ(ξ,η) xᵢ</code>, <code>J(ξ,η) = Σᵢ xᵢ ⊗ ∇N̂ᵢ(ξ,η)</code>.
          Both J and det(J) vary across the element in general.
        </span>
        <span className="formula-text">
          Representative (at ref centroid): J = {formatMatrix2(trace.jacobian)},
          det(J) = {formatNumber(trace.determinant)}, |Q| = {formatNumber(trace.area)}
        </span>
      </div>
      <div className="quadrature-table">
        <div className="row header">
          <span>q</span>
          <span>ξ_q</span>
          <span>det J(ξ_q)</span>
          <span>J^(-T)∇N̂ᵢ(ξ_q) (all i)</span>
        </div>
        {quadratureSamples.map((sample, qIndex) => (
          <div key={qIndex} className="row">
            <span>{qIndex + 1}</span>
            <span>({formatNumber(sample.referencePoint.x)}, {formatNumber(sample.referencePoint.y)})</span>
            <span>{formatNumber(sample.determinant)}</span>
            <span>
              {sample.physicalGradients
                .map((g, i) => `N${subscript(i + 1)}:(${formatVector(g)})`)
                .join(' | ')}
            </span>
          </div>
        ))}
      </div>
      {localStiffness.map((row, rowIndex) => (
        <div key={rowIndex} className="formula-row">
          {row.map((value, columnIndex) => {
            const perSample = quadratureSamples.map(
              (s) =>
                s.weight *
                Math.abs(s.determinant) *
                (s.physicalGradients[rowIndex].x * s.physicalGradients[columnIndex].x +
                  s.physicalGradients[rowIndex].y * s.physicalGradients[columnIndex].y),
            )
            return (
              <div key={columnIndex} className="formula-cell">
                <span className="formula-symbol">
                  K[{rowIndex + 1},{columnIndex + 1}]
                </span>
                <span className="formula-text">
                  Σ_q w_q · |det J(ξ_q)| · (J^(-T)∇N̂{subscript(rowIndex + 1)}) · (J^(-T)∇N̂{subscript(columnIndex + 1)})
                </span>
                <span className="formula-text">
                  = {perSample.map((v) => formatNumber(v)).join(' + ')}
                </span>
                <strong>{formatNumber(value)}</strong>
              </div>
            )
          })}
        </div>
      ))}
      {n === 0 ? <p className="small-note">(empty)</p> : null}
    </div>
  )
}

const NODE_COLORS: Record<ElementKind, string[]> = {
  quad: ['#cf5a36', '#d8a137', '#2f8f83', '#4a6fa5'],
  triangle: ['#cf5a36', '#d8a137', '#2f8f83'],
}

function RefToPhysMappingSvg({
  elementKind,
  mesh,
  selectedElementId,
}: {
  elementKind: ElementKind
  mesh: Mesh
  selectedElementId: number
}) {
  const element = mesh.elements[selectedElementId]
  const colors = NODE_COLORS[elementKind]

  const refCorners =
    elementKind === 'quad'
      ? [
          { xi: 0, eta: 0, label: 'N₁' },
          { xi: 1, eta: 0, label: 'N₂' },
          { xi: 1, eta: 1, label: 'N₃' },
          { xi: 0, eta: 1, label: 'N₄' },
        ]
      : [
          { xi: 0, eta: 0, label: 'φ₁' },
          { xi: 1, eta: 0, label: 'φ₂' },
          { xi: 0, eta: 1, label: 'φ₃' },
        ]

  const W = 560, H = 252
  const OX = 28, OY = 216, S = 174  // ref-panel origin and scale
  const RX = 300                     // right-panel x offset

  const toRef = (xi: number, eta: number) => ({ x: OX + xi * S, y: OY - eta * S })
  const toPhys = (px: number, py: number) => ({ x: RX + OX + px * S, y: OY - py * S })

  const refPts = refCorners.map(c => toRef(c.xi, c.eta))
  const physNodePts = element.nodeIds.map(id => mesh.nodes[id].point)
  const physPts = physNodePts.map(p => toPhys(p.x, p.y))

  const refPolygon = refPts.map(p => `${p.x},${p.y}`).join(' ')
  const physPolygon = physPts.map(p => `${p.x},${p.y}`).join(' ')

  const domainLabel = elementKind === 'quad' ? 'Q̂' : 'T̂'

  // Centroid of each shape in SVG coords, for fill labels
  const refFillX = elementKind === 'quad' ? OX + S / 2 : OX + S / 3
  const refFillY = elementKind === 'quad' ? OY - S / 2 : OY - S / 3
  const physCx = physNodePts.reduce((s, p) => s + p.x, 0) / physNodePts.length
  const physCy = physNodePts.reduce((s, p) => s + p.y, 0) / physNodePts.length
  const physFill = toPhys(physCx, physCy)

  // Push node labels away from the shape center
  const labelOff = (svgPt: Vector2, centerX: number, centerY: number) => ({
    dx: svgPt.x < centerX ? -34 : 8,
    dy: svgPt.y > centerY ? 15 : -6,
  })

  const ax1 = OX + S + 20
  const ax2 = RX + OX - 16
  const arrowY = H / 2 - 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="reference-svg">
      <rect x="0" y="0" width={W} height={H} rx="22" />
      <defs>
        <marker id="map-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(31,36,48,0.5)" />
        </marker>
      </defs>

      {/* Reference element */}
      <polygon points={refPolygon} className="reference-triangle-shape" />
      <line x1={OX} y1={OY} x2={OX + S + 12} y2={OY} className="reference-axis" />
      <line x1={OX} y1={OY} x2={OX} y2={OY - S - 12} className="reference-axis" />
      <text x={OX + S + 16} y={OY + 5} className="reference-axis-label">ξ</text>
      <text x={OX - 16} y={OY - S - 8} className="reference-axis-label">η</text>
      <text x={refFillX - 6} y={refFillY + 6} className="reference-fill-label">{domainLabel}</text>
      {refPts.map((pt, i) => {
        const { dx, dy } = labelOff(pt, refFillX, refFillY)
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="6" fill={colors[i]} />
            <text x={pt.x + dx} y={pt.y + dy} className="reference-node-label">
              {refCorners[i].label}
            </text>
          </g>
        )
      })}

      {/* Arrow */}
      <line
        x1={ax1} y1={arrowY} x2={ax2} y2={arrowY}
        stroke="rgba(31,36,48,0.5)" strokeWidth="2"
        markerEnd="url(#map-arrow)"
      />
      <text x={(ax1 + ax2) / 2} y={arrowY - 9} textAnchor="middle" className="reference-fill-label">F</text>

      {/* Physical element */}
      <polygon points={physPolygon} className="reference-triangle-shape" />
      <line x1={RX + OX} y1={OY} x2={RX + OX + S + 12} y2={OY} className="reference-axis" />
      <line x1={RX + OX} y1={OY} x2={RX + OX} y2={OY - S - 12} className="reference-axis" />
      <text x={RX + OX + S + 16} y={OY + 5} className="reference-axis-label">x</text>
      <text x={RX + OX - 14} y={OY - S - 8} className="reference-axis-label">y</text>
      <text x={physFill.x - 6} y={physFill.y + 6} className="reference-fill-label">K</text>
      {physPts.map((pt, i) => {
        const { dx, dy } = labelOff(pt, physFill.x, physFill.y)
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="6" fill={colors[i]} />
            <text x={pt.x + dx} y={pt.y + dy} className="reference-node-label">
              x{['₁', '₂', '₃', '₄'][i]}
            </text>
          </g>
        )
      })}
    </svg>
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

function BasisFunctionGallery({ elementKind }: { elementKind: ElementKind }) {
  const domain = elementKind === 'quad' ? 'square' : 'triangle'
  const basisDefinitions =
    elementKind === 'quad'
      ? ([
          {
            name: 'N₁',
            formula: '(1-ξ)(1-η)',
            color: '#cf5a36',
            evaluate: (x: number, y: number) => (1 - x) * (1 - y),
          },
          {
            name: 'N₂',
            formula: 'ξ(1-η)',
            color: '#d8a137',
            evaluate: (x: number, y: number) => x * (1 - y),
          },
          {
            name: 'N₃',
            formula: 'ξη',
            color: '#2f8f83',
            evaluate: (x: number, y: number) => x * y,
          },
          {
            name: 'N₄',
            formula: '(1-ξ)η',
            color: '#4a6fa5',
            evaluate: (x: number, y: number) => (1 - x) * y,
          },
        ] as const)
      : ([
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
        ] as const)

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
            domain={domain}
          />
        </div>
      ))}
    </div>
  )
}

function ReferenceSquareSvg() {
  const vertices = [
    { x: 38, y: 242, label: '(0,0)' },
    { x: 242, y: 242, label: '(1,0)' },
    { x: 242, y: 38, label: '(1,1)' },
    { x: 38, y: 38, label: '(0,1)' },
  ]

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points="38,242 242,242 242,38 38,38" className="reference-triangle-shape" />
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
      <text x="116" y="145" className="reference-fill-label">Q̂</text>
    </svg>
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
            className={element.id === selectedElementId ? 'mesh-element selected' : 'mesh-element'}
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

function clampSelectedElementId(config: SimulationConfig, elementCount: number): number {
  const maxElementId = Math.max(elementCount - 1, 0)
  return Math.max(0, Math.min(config.selectedElementId, maxElementId))
}

function elementLabel(kind: ElementKind, plural: boolean): string {
  if (kind === 'quad') return plural ? 'Quadrilaterals' : 'Quadrilateral'
  return plural ? 'Triangles' : 'Triangle'
}

function quadratureLabel(kind: QuadratureKind): string {
  switch (kind) {
    case 'trapezoidal':
      return 'Trapezoidal (vertices)'
    case 'centroid':
      return 'Centroid'
    case 'quad-trapezoidal':
      return 'Trapezoidal (corners)'
    case 'quad-gauss2x2':
      return 'Gauss 2×2'
  }
}

export default App
