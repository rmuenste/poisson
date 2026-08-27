import { Figure } from './Figure.tsx'

export function SaddlePointBlocks() {
  return (
    <Figure caption="The discrete system of one time step. The empty pressure–pressure block is what makes it a saddle point rather than something a standard solver can march through.">
      <svg viewBox="0 0 360 210" className="topic-figure" role="img" aria-label="Block structure of the discrete saddle point system">
        <rect className="fig-block" x="34" y="40" width="76" height="52" />
        <text className="fig-block-label" x="72" y="72" textAnchor="middle">S</text>

        <rect className="fig-block" x="110" y="40" width="76" height="52" />
        <text className="fig-block-label" x="148" y="72" textAnchor="middle">kB</text>

        <rect className="fig-block" x="34" y="92" width="76" height="52" />
        <text className="fig-block-label" x="72" y="124" textAnchor="middle">Bᵀ</text>

        <rect className="fig-block empty" x="110" y="92" width="76" height="52" />
        <text className="fig-block-label empty" x="148" y="124" textAnchor="middle">0</text>

        <rect className="fig-vector" x="200" y="40" width="42" height="104" />
        <text className="fig-block-label" x="221" y="72" textAnchor="middle">u</text>
        <text className="fig-block-label" x="221" y="124" textAnchor="middle">p</text>

        <text className="fig-block-label" x="256" y="98" textAnchor="middle">=</text>

        <rect className="fig-vector" x="272" y="40" width="42" height="104" />
        <text className="fig-block-label" x="293" y="72" textAnchor="middle">g</text>
        <text className="fig-block-label" x="293" y="124" textAnchor="middle">0</text>

        <path className="fig-leader" d="M148 150 L148 164" />
        <text className="fig-label" x="176" y="176" textAnchor="middle">
          no pressure block — p enforces
        </text>
        <text className="fig-label" x="176" y="190" textAnchor="middle">
          the constraint, it does not evolve
        </text>
      </svg>
    </Figure>
  )
}
