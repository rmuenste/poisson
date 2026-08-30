import * as React from 'react'
import { TopicIntro } from '../TopicIntro.tsx'
import { projectionTopicMeta } from './meta.ts'
import { notation } from './notation.ts'
import { EquationsSection } from './sections/EquationsSection.tsx'
import { DiscretizeSection } from './sections/DiscretizeSection.tsx'
import { SchurSection } from './sections/SchurSection.tsx'
import { IterationSection } from './sections/IterationSection.tsx'
import { AlgorithmSection } from './sections/AlgorithmSection.tsx'
import { PressurePoissonSection } from './sections/PressurePoissonSection.tsx'
import { CostSection } from './sections/CostSection.tsx'
import { ExampleSection } from './sections/ExampleSection.tsx'
import { FeatflowSection } from './sections/FeatflowSection.tsx'
import {
  defaultProjectionConfig,
  runProjection,
  type ProjectionConfig,
} from '../../core/projection/projectionStep.ts'

const sections = [
  { key: 'equations', label: 'equations', View: EquationsSection },
  { key: 'discretize', label: 'discretize', View: DiscretizeSection },
  { key: 'schur', label: 'schur complement', View: SchurSection },
  { key: 'iteration', label: 'basic iteration', View: IterationSection },
  { key: 'algorithm', label: 'the algorithm', View: AlgorithmSection },
  { key: 'pressure-poisson', label: 'pressure-poisson', View: PressurePoissonSection },
  { key: 'cost', label: 'cost & verdict', View: CostSection },
  { key: 'example', label: 'worked example', View: null },
  { key: 'featflow', label: 'in production', View: FeatflowSection },
] as const

type SectionKey = (typeof sections)[number]['key']

export function ProjectionTopic() {
  const [activeSection, setActiveSection] = React.useState<SectionKey>('equations')
  const [exampleConfig, setExampleConfig] = React.useState<ProjectionConfig>(
    defaultProjectionConfig,
  )
  const active = sections.find((section) => section.key === activeSection) ?? sections[0]
  const ActiveView = active.View

  // Only the worked example needs a solve; every other section is static.
  const run = React.useMemo(
    () => (activeSection === 'example' ? runProjection(exampleConfig) : null),
    [activeSection, exampleConfig],
  )

  return (
    <>
      <header className="hero">
        <TopicIntro topic={projectionTopicMeta} />
        <div className="hero-card">
          <div className="metric">
            <span>Per time step (2D)</span>
            <strong>2 + 1 solves</strong>
          </div>
          <div className="metric">
            <span>Continuity</span>
            <strong>exact</strong>
          </div>
          <div className="metric">
            <span>Momentum</span>
            <strong>approximate</strong>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="control-panel">
          <section className="panel-card">
            <h2>Sections</h2>
            <div className="stage-list">
              {sections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  className={
                    section.key === activeSection ? 'stage-button active' : 'stage-button'
                  }
                  onClick={() => setActiveSection(section.key)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </section>

          {activeSection === 'example' ? (
            <section className="panel-card">
              <h2>Example controls</h2>
              <ControlRow
                label="Cells per side"
                value={`${exampleConfig.divisions} x ${exampleConfig.divisions}`}
                input={
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={exampleConfig.divisions}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        divisions: Number(event.target.value),
                      }))
                    }
                  />
                }
              />
              <ControlRow
                label="Viscosity"
                value={exampleConfig.viscosity.toFixed(2)}
                input={
                  <input
                    type="range"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={exampleConfig.viscosity}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        viscosity: Number(event.target.value),
                      }))
                    }
                  />
                }
              />
              <ControlRow
                label="Time step k"
                value={exampleConfig.timeStep.toFixed(2)}
                input={
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={exampleConfig.timeStep}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        timeStep: Number(event.target.value),
                      }))
                    }
                  />
                }
              />
              <ControlRow
                label="Theta"
                value={
                  exampleConfig.theta === 1
                    ? '1 (backward Euler)'
                    : exampleConfig.theta === 0.5
                      ? '1/2 (Crank-Nicolson)'
                      : exampleConfig.theta.toFixed(2)
                }
                input={
                  <select
                    value={exampleConfig.theta}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        theta: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={1}>Backward Euler</option>
                    <option value={0.5}>Crank-Nicolson</option>
                  </select>
                }
              />
              <ControlRow
                label="Time steps"
                value={String(exampleConfig.stepCount)}
                input={
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={exampleConfig.stepCount}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        stepCount: Number(event.target.value),
                      }))
                    }
                  />
                }
              />
              <ControlRow
                label="Diffusive term"
                value={exampleConfig.useDiffusivePreconditioner ? 'on' : 'off'}
                input={
                  <select
                    value={exampleConfig.useDiffusivePreconditioner ? 'on' : 'off'}
                    onChange={(event) =>
                      setExampleConfig((current) => ({
                        ...current,
                        useDiffusivePreconditioner: event.target.value === 'on',
                      }))
                    }
                  >
                    <option value="off">off (pure projection)</option>
                    <option value="on">on (α_D M_p⁻¹ f_p)</option>
                  </select>
                }
              />
            </section>
          ) : null}

          <section className="panel-card">
            <h2>Notation</h2>
            <p className="small-note">Symbols follow Turek's own notation throughout.</p>
            <dl className="notation-table">
              {notation.map((entry) => (
                <React.Fragment key={entry.symbol}>
                  <dt>{entry.symbol}</dt>
                  <dd>{entry.meaning}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>

          <section className="panel-card">
            <h2>Where this sits</h2>
            <ul className="compact-list">
              <li>
                Both branches solve the same discrete system; they differ in which loop is outer.
              </li>
              <li>
                <strong>Projection (PP)</strong> puts incompressibility outside — one pressure step
                per time step, velocity solves inside.
              </li>
              <li>
                <strong>Coupled Galerkin (CC)</strong> puts the nonlinearity outside and solves the
                coupled system in the inner loop.
              </li>
            </ul>
          </section>
        </aside>

        <main className="workspace">
          {ActiveView ? <ActiveView /> : run ? <ExampleSection run={run} /> : null}
        </main>
      </div>
    </>
  )
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
