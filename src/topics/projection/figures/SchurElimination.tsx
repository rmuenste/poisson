import { Figure } from './Figure.tsx'

export function SchurElimination() {
  return (
    <Figure caption="Formally eliminating the velocity turns a coupled indefinite system into one scalar equation for the pressure — at the price of an S⁻¹ hidden inside A.">
      <svg viewBox="0 0 360 150" className="topic-figure" role="img" aria-label="Elimination of the velocity from the block system">
        <defs>
          <marker id="schur-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path className="fig-arrow-head" d="M0 0 L7 3 L0 6 z" />
          </marker>
        </defs>
        <rect className="fig-block" x="20" y="34" width="52" height="34" />
        <text className="fig-block-label small" x="46" y="56" textAnchor="middle">S</text>
        <rect className="fig-block" x="72" y="34" width="52" height="34" />
        <text className="fig-block-label small" x="98" y="56" textAnchor="middle">kB</text>
        <rect className="fig-block" x="20" y="68" width="52" height="34" />
        <text className="fig-block-label small" x="46" y="90" textAnchor="middle">Bᵀ</text>
        <rect className="fig-block empty" x="72" y="68" width="52" height="34" />
        <text className="fig-block-label small empty" x="98" y="90" textAnchor="middle">0</text>
        <text className="fig-label" x="72" y="120" textAnchor="middle">unknowns u and p</text>

        <path className="fig-arrow" d="M136 68 L216 68" markerEnd="url(#schur-arrow)" />
        <text className="fig-label" x="176" y="52" textAnchor="middle">u = S⁻¹(g − kBp)</text>
        <text className="fig-label" x="176" y="88" textAnchor="middle">into Bᵀu = 0</text>

        <rect className="fig-block accent" x="228" y="42" width="112" height="52" />
        <text className="fig-block-label" x="284" y="74" textAnchor="middle">A p = f</text>
        <text className="fig-label" x="284" y="120" textAnchor="middle">A = BᵀS⁻¹B, scalar in p</text>
      </svg>
    </Figure>
  )
}
