import * as React from 'react'
import './App.css'
import { PlannedTopic } from './topics/PlannedTopic.tsx'
import { defaultTopicId, topics } from './topics/registry.ts'
import { TopicMenu } from './ui/TopicMenu.tsx'

/**
 * Application shell. It owns the topic menu and nothing else — every topic
 * brings its own layout, controls and state.
 */
function App() {
  const [activeTopicId, setActiveTopicId] = React.useState(defaultTopicId)
  const activeTopic = topics.find((topic) => topic.id === activeTopicId) ?? topics[0]
  const TopicView = activeTopic.View

  return (
    <div className="app-shell">
      <TopicMenu
        topics={topics}
        activeTopicId={activeTopic.id}
        onSelect={setActiveTopicId}
      />
      {TopicView ? <TopicView /> : <PlannedTopic topic={activeTopic} />}
    </div>
  )
}

export default App
