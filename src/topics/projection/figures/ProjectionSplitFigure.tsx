import { Figure } from './Figure.tsx'

export function ProjectionSplitFigure() {
  return (
    <Figure caption="Step 5 read as a splitting: the intermediate velocity is the discretely divergence-free field plus a discrete gradient. Subtracting the gradient part is the projection.">
      <svg viewBox="0 0 340 190" className="topic-figure" role="img" aria-label="Splitting of the intermediate velocity into a divergence free part and a discrete gradient">
        <defs>
          <marker id="split-arrow" markerWidth="9" markerHeight="9" refX="8" refY="3.2" orient="auto">
            <path className="fig-arrow-head" d="M0 0 L8 3.2 L0 6.4 z" />
          </marker>
          <marker id="split-arrow-accent" markerWidth="9" markerHeight="9" refX="8" refY="3.2" orient="auto">
            <path className="fig-arrow-head accent" d="M0 0 L8 3.2 L0 6.4 z" />
          </marker>
        </defs>

        <path className="fig-vector-arrow intermediate" d="M40 150 L250 46" markerEnd="url(#split-arrow)" />
        <text className="fig-label-strong" x="132" y="86" textAnchor="middle">ũⁿ</text>

        <path className="fig-vector-arrow divergence-free" d="M40 150 L250 150" markerEnd="url(#split-arrow-accent)" />
        <text className="fig-label-strong accent" x="140" y="170" textAnchor="middle">uⁿ,  Bᵀuⁿ = 0</text>

        <path className="fig-vector-arrow gradient" d="M250 150 L250 46" markerEnd="url(#split-arrow)" />
        <text className="fig-label-strong" x="262" y="102">k Mₗ⁻¹B q</text>

        <circle className="fig-origin" cx="40" cy="150" r="4" />
      </svg>
    </Figure>
  )
}
