import type { Topic } from '../topics/types.ts'

/**
 * Top-level topic navigation. Planned topics stay selectable so their scope can
 * be read; they are marked rather than disabled.
 */
export function TopicMenu({
  topics,
  activeTopicId,
  onSelect,
}: {
  topics: Topic[]
  activeTopicId: string
  onSelect: (topicId: string) => void
}) {
  return (
    <nav className="topic-bar" aria-label="Topics">
      <div className="topic-brand">
        <span className="topic-brand-mark">FE</span>
        <div>
          <strong>Numerics Explorer</strong>
          <span>Interactive finite element topics</span>
        </div>
      </div>
      <div className="topic-tabs" role="tablist">
        {topics.map((topic) => {
          const active = topic.id === activeTopicId
          return (
            <button
              key={topic.id}
              role="tab"
              type="button"
              aria-selected={active}
              className={active ? 'topic-tab active' : 'topic-tab'}
              onClick={() => onSelect(topic.id)}
            >
              <span className="topic-tab-title">{topic.title}</span>
              <span className="topic-tab-note">
                {topic.status === 'planned' ? 'Planned' : topic.tagline}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
