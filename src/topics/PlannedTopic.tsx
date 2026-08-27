import { TopicIntro } from './TopicIntro.tsx'
import type { Topic } from './types.ts'

/**
 * Landing area for a topic that is listed in the menu but not implemented yet.
 * It states what the topic will cover so the menu stays honest about scope.
 */
export function PlannedTopic({ topic }: { topic: Topic }) {
  return (
    <>
      <header className="hero">
        <TopicIntro topic={topic} />
        <div className="hero-card">
          <div className="metric">
            <span>Status</span>
            <strong>Planned</strong>
          </div>
          <p className="small-note">
            This topic is reserved in the menu. The Poisson solver is the reference
            implementation for how a topic is put together.
          </p>
        </div>
      </header>

      <section className="panel-card planned-topic">
        <h2>Planned coverage</h2>
        <ul className="compact-list">
          {topic.outline.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  )
}
