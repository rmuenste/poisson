import type * as React from 'react'

/** Wrapper giving every figure in this topic the same frame and caption style. */
export function Figure({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <figure className="figure">
      {children}
      <figcaption className="figure-caption">{caption}</figcaption>
    </figure>
  )
}
