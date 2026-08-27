import type * as React from 'react'

/**
 * A topic is one self-contained explorable subject in the app. The Poisson FEM
 * explorer is the first one; further topics plug in by adding an entry to the
 * registry, so the shell never needs to know what any topic actually does.
 */
export type TopicStatus = 'available' | 'planned'

export interface Topic {
  id: string
  /** Menu label. */
  title: string
  /** Secondary menu line — kept short enough to fit inside a tab. */
  tagline: string
  /** Uppercase kicker rendered above the topic headline. */
  eyebrow: string
  /** One-paragraph introduction for the topic landing area. */
  lede: string
  status: TopicStatus
  /** What the topic covers (or will cover, while it is still planned). */
  outline: string[]
  /** Rendered when the topic is available. Planned topics fall back to a stub. */
  View?: React.ComponentType
}
