import { Figure } from './Figure.tsx'

type FlowStep = {
  index: number
  equation: string
  /** 'solve' marks the two steps that actually cost a linear solve. */
  kind: 'solve' | 'cheap'
  /** Quantity handed to the next step, drawn on the connecting arrow. */
  carries?: string
}

const STEPS: FlowStep[] = [
  { index: 1, equation: 'S ũⁿ = g − k B pⁿ⁻¹', kind: 'solve', carries: 'ũⁿ' },
  { index: 2, equation: 'f_p = (1/k) Bᵀ ũⁿ', kind: 'cheap', carries: 'f_p' },
  { index: 3, equation: 'R q = f_p,  R = BᵀMₗ⁻¹B', kind: 'solve', carries: 'q' },
  { index: 4, equation: 'pⁿ = pⁿ⁻¹ + α_R q + α_D M_p⁻¹ f_p', kind: 'cheap' },
  { index: 5, equation: 'uⁿ = ũⁿ − k Mₗ⁻¹ B q', kind: 'cheap' },
]

const BOX_HEIGHT = 34
const BOX_GAP = 14
const TOP = 16

export function AlgorithmFlow() {
  return (
    <Figure caption="One time step of the PP scheme. Only steps 1 and 3 cost a linear solve; everything else is a matrix–vector product against a diagonal or sparse matrix.">
      <svg
        viewBox="0 0 360 254"
        className="topic-figure"
        role="img"
        aria-label="Flow of the five substeps of the PP algorithm"
      >
        <defs>
          <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path className="fig-arrow-head" d="M0 0 L7 3 L0 6 z" />
          </marker>
        </defs>

        {STEPS.map((step, i) => {
          const y = TOP + i * (BOX_HEIGHT + BOX_GAP)
          const arrowTop = y + BOX_HEIGHT
          return (
            <g key={step.index}>
              <rect
                className={step.kind === 'solve' ? 'fig-step solve' : 'fig-step'}
                x="46"
                y={y}
                width="286"
                height={BOX_HEIGHT}
                rx="10"
              />
              <circle className="fig-step-index" cx="28" cy={y + BOX_HEIGHT / 2} r="12" />
              <text className="fig-step-index-label" x="28" y={y + BOX_HEIGHT / 2 + 4} textAnchor="middle">
                {step.index}
              </text>
              <text className="fig-step-equation" x="58" y={y + BOX_HEIGHT / 2 + 4}>
                {step.equation}
              </text>
              {i < STEPS.length - 1 ? (
                <path
                  className="fig-arrow"
                  d={`M96 ${arrowTop} L96 ${arrowTop + BOX_GAP}`}
                  markerEnd="url(#flow-arrow)"
                />
              ) : null}
              {step.carries ? (
                <text className="fig-label" x="106" y={arrowTop + BOX_GAP - 3}>
                  {step.carries}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </Figure>
  )
}
