import type { Topic } from './types.ts'

/** Eyebrow + headline + lede, shared by every topic landing area. */
export function TopicIntro({ topic }: { topic: Omit<Topic, 'View'> }) {
  return (
    <div>
      <p className="eyebrow">{topic.eyebrow}</p>
      <h1>{topic.title}</h1>
      <p className="lede">{topic.lede}</p>
    </div>
  )
}
