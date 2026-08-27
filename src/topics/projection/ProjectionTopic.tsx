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

const sections = [
  { key: 'equations', label: 'equations', View: EquationsSection },
  { key: 'discretize', label: 'discretize', View: DiscretizeSection },
  { key: 'schur', label: 'schur complement', View: SchurSection },
  { key: 'iteration', label: 'basic iteration', View: IterationSection },
  { key: 'algorithm', label: 'the algorithm', View: AlgorithmSection },
  { key: 'pressure-poisson', label: 'pressure-poisson', View: PressurePoissonSection },
  { key: 'cost', label: 'cost & verdict', View: CostSection },
] as const

type SectionKey = (typeof sections)[number]['key']

export function ProjectionTopic() {
  const [activeSection, setActiveSection] = React.useState<SectionKey>('equations')
  const active = sections.find((section) => section.key === activeSection) ?? sections[0]
  const ActiveView = active.View

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
          <ActiveView />
        </main>
      </div>
    </>
  )
}
