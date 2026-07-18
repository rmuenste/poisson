import type { ElementKind, Vector2 } from '../../core/fem/mesh.ts'
import type { QuadratureKind } from '../../core/quadrature/quadrature.ts'
import { formatNumber, formatPoint, isQuadKind } from '../shared.ts'

export function QuadratureStageView({
  title,
  kind,
  elementKind,
  samples,
}: {
  title: string
  kind: QuadratureKind
  elementKind: ElementKind
  samples: Array<{
    referencePoint: Vector2
    physicalPoint: Vector2
    weight: number
    shapeValues: number[]
    sourceValue: number
  }>
}) {
  const weightSum = samples.reduce((sum, s) => sum + s.weight, 0)
  const referenceAreaLabel = isQuadKind(elementKind) ? 'area(Q̂) = 1' : 'area(T̂) = 1/2'
  const quadratureExplanation = quadratureExplanationFor(kind)
  const domainRef = isQuadKind(elementKind) ? 'Q̂' : 'T̂'
  const domainSym = isQuadKind(elementKind) ? 'Q' : 'T'
  const basisSym = isQuadKind(elementKind) ? 'N̂' : 'φ̂'

  return (
    <section className="panel-card stage-view">
      <h2>Quadrature and local sampling</h2>
      <p>
        Active rule: <strong>{title}</strong>
      </p>

      <div className="note-grid">
        <article>
          <h3>Approximation formula</h3>
          <p className="small-note">
            Every integral over an element is pulled back to the reference domain
            {' '}
            {isQuadKind(elementKind) ? 'Q̂ = [0,1]²' : 'T̂'}
            {' '}
            and approximated by a weighted sum of pointwise evaluations.
            Here q indexes the quadrature points, (ξ_q, η_q) are their reference coordinates,
            w_q are the associated weights, Σ_q denotes the sum over all points,
            and g stands for any integrand evaluated at (ξ_q, η_q):
          </p>
          <p className="math-block">∫_{domainRef} g(ξ,η) dξdη ≈ Σ_q w_q · g(ξ_q, η_q)</p>
          <p className="small-note">
            This is applied to both quantities assembled per element.
            The source term f is the right-hand side of the PDE (here f = 1 everywhere),
            and J is the Jacobian of the element map F: {domainRef} → physical element:
          </p>
          <p className="math-block">K_{domainSym}[i,j] ≈ Σ_q w_q · (∇{basisSym}ᵢ · ∇{basisSym}ⱼ) · |det J|</p>
          <p className="math-block">b_{domainSym}[i]   ≈ Σ_q w_q · f(x_q) · {basisSym}ᵢ(ξ_q) · |det J|</p>
          <p className="small-note">{quadratureExplanation}</p>
        </article>

        <article>
          <h3>Points on {isQuadKind(elementKind) ? 'Q̂' : 'T̂'}</h3>
          <QuadraturePointsSvg samples={samples} elementKind={elementKind} />
          <div className="quad-legend">
            {samples.map((s, index) => (
              <div key={index} className="quad-legend-row">
                <span className="quad-dot" />
                <span>q{index + 1}</span>
                <span>({formatNumber(s.referencePoint.x)}, {formatNumber(s.referencePoint.y)})</span>
                <span>w = {formatWeightFraction(s.weight)}</span>
              </div>
            ))}
            <div className="quad-legend-row quad-legend-sum">
              <span />
              <span />
              <span />
              <span>Σ w_q = {formatWeightFraction(weightSum)} = {referenceAreaLabel} ✓</span>
            </div>
          </div>
        </article>
      </div>

      <article>
        <h3>Sample data — selected element</h3>
        <p className="small-note">
          Each physical point x_q = F(ξ_q, η_q) = x₁ + J · ξ_q is the image of the reference
          quadrature point under the element map. Shape values {basisSym}ᵢ(ξ_q) are evaluated at the
          reference coordinates and reused for both K_{domainSym} and b_{domainSym}.
        </p>
        <div className="quadrature-table">
          <div className="row header">
            <span>Ref point (ξ,η)</span>
            <span>Physical point x_q</span>
            <span>Weight w_q</span>
            <span>Shape values {basisSym}ᵢ(ξ_q)</span>
            <span>f(x_q)</span>
          </div>
          {samples.map((sample, index) => (
            <div key={index} className="row">
              <span>{formatPoint(sample.referencePoint)}</span>
              <span>{formatPoint(sample.physicalPoint)}</span>
              <span>{formatNumber(sample.weight)}</span>
              <span>{sample.shapeValues.map(formatNumber).join(', ')}</span>
              <span>{formatNumber(sample.sourceValue)}</span>
            </div>
          ))}
          <div className="row quadrature-sum-row">
            <span />
            <span />
            <span>{formatWeightFraction(weightSum)} = {referenceAreaLabel} ✓</span>
            <span />
            <span />
          </div>
        </div>
      </article>
    </section>
  )
}

function QuadraturePointsSvg({
  samples,
  elementKind,
}: {
  samples: Array<{ referencePoint: Vector2; weight: number }>
  elementKind: ElementKind
}) {
  const toSvg = (xi: number, eta: number) => ({
    x: 38 + xi * 204,
    y: 242 - eta * 204,
  })
  const domainPoints = isQuadKind(elementKind)
    ? '38,242 242,242 242,38 38,38'
    : '38,242 242,242 38,38'
  const domainLabel = isQuadKind(elementKind) ? 'Q̂' : 'T̂'
  const labelY = isQuadKind(elementKind) ? 145 : 168

  return (
    <svg className="reference-svg" viewBox="0 0 280 280">
      <rect x="0" y="0" width="280" height="280" rx="22" />
      <polygon points={domainPoints} className="reference-triangle-shape" />
      <line x1="38" y1="242" x2="242" y2="242" className="reference-axis" />
      <line x1="38" y1="242" x2="38" y2="38" className="reference-axis" />
      <text x="250" y="248" className="reference-axis-label">ξ</text>
      <text x="24" y="30" className="reference-axis-label">η</text>
      <text x="116" y={labelY} className="reference-fill-label">{domainLabel}</text>
      {samples.map((sample, index) => {
        const pt = toSvg(sample.referencePoint.x, sample.referencePoint.y)
        const { dx, dy } = quadPointLabelOffset(sample.referencePoint.x, sample.referencePoint.y)
        return (
          <g key={index}>
            <circle cx={pt.x} cy={pt.y} r="7" className="quadrature-point" />
            <text x={pt.x + dx} y={pt.y + dy} className="quadrature-point-label">
              q{index + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function quadPointLabelOffset(xi: number, eta: number): { dx: number; dy: number } {
  if (xi > 0.8) return { dx: -22, dy: -10 }   // bottom-right vertex: label to the left
  if (eta > 0.8) return { dx: 10, dy: 20 }    // top-left vertex: label below
  return { dx: 10, dy: -10 }                  // bottom-left or interior: label above-right
}

function formatWeightFraction(weight: number): string {
  if (Math.abs(weight - 1 / 6) < 1e-9) return '1/6'
  if (Math.abs(weight - 1 / 2) < 1e-9) return '1/2'
  if (Math.abs(weight - 1 / 3) < 1e-9) return '1/3'
  if (Math.abs(weight - 1 / 4) < 1e-9) return '1/4'
  if (Math.abs(weight - 1) < 1e-9) return '1'
  return formatNumber(weight)
}

function quadratureExplanationFor(kind: QuadratureKind): string {
  switch (kind) {
    case 'trapezoidal':
      return 'The vertex trapezoidal rule places one point at each vertex of T̂ with equal weight 1/6. It integrates polynomials of degree ≤ 1 exactly. Because ∇φ̂ᵢ · ∇φ̂ⱼ is constant on every linear triangle, stiffness entries are always exact. Load entries ∫ f·φ̂ᵢ are exact when f is at most linear.'
    case 'centroid':
      return 'The centroid rule places a single point at (⅓, ⅓) with weight ½. It also integrates degree ≤ 1 exactly using just one function evaluation, at the cost of resolving less spatial variation within the element.'
    case 'quad-trapezoidal':
      return 'The vertex trapezoidal rule on Q̂ places one point at each corner of [0,1]² with equal weight 1/4. It reproduces bilinear integrands exactly per coordinate direction. Because ∇Nᵢ varies linearly on Q̂, stiffness entries are not generally exact — Gauss 2×2 is the usual choice for Q1.'
    case 'quad-gauss2x2':
      return 'The 2×2 Gauss–Legendre rule on [0,1]² places four points at ξ,η ∈ {½ ∓ 1/(2√3)} with equal weight 1/4. It integrates polynomials of degree ≤ 3 per coordinate direction exactly. Because the Q1 stiffness integrand (∇Nᵢ · ∇Nⱼ) |det J| is at most bicubic on affine quads, stiffness is computed exactly.'
    case 'quad-gauss3x3':
      return 'The 3×3 Gauss–Legendre rule on [0,1]² places nine points on a tensor grid at the 1D nodes ½ ± ½√(3/5) and ½, with weights 5/18, 5/18, and 4/9. It integrates polynomials of degree ≤ 5 per coordinate direction exactly — sufficient for Q2 stiffness and load on affine-mapped quads.'
    case 'triangle-gauss3':
      return 'The 3-point edge-midpoint rule on T̂ places one point at each midpoint (1/6, 1/6), (2/3, 1/6), (1/6, 2/3) with equal weight 1/6. It is exact for polynomials of degree ≤ 2, sufficient for the P2 load vector and (because P2 stiffness integrands are degree ≤ 2 on affine triangles) for the stiffness matrix as well.'
  }
}
