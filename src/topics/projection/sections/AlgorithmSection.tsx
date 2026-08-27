import { AlgorithmFlow } from '../figures/AlgorithmFlow.tsx'
import { ProjectionSplitFigure } from '../figures/ProjectionSplitFigure.tsx'

const STEPS = [
  {
    index: 1,
    title: 'Intermediate velocity',
    equation: 'S ũⁿ = g − k B pⁿ⁻¹',
    detail:
      'Solve for a provisional velocity using the old pressure. Fully nonlinear this is a Burgers problem; linearized it is a convection–diffusion problem. Either way it decouples into one scalar solve per velocity component — two in 2D, three in 3D.',
    cost: 'one solve per velocity component',
  },
  {
    index: 2,
    title: 'Defect',
    equation: 'f_p = (1/k) Bᵀ ũⁿ',
    detail:
      'Take the discrete divergence of the intermediate velocity. By the identity in §4 this is exactly the residual f − A pⁿ⁻¹ of the pressure equation — it measures how far ũⁿ is from being divergence-free.',
    cost: 'one sparse matrix–vector product',
  },
  {
    index: 3,
    title: 'Pressure-Poisson solve',
    equation: 'R q = f_p,   R = P = BᵀMₗ⁻¹B',
    detail:
      'Apply the reactive preconditioner: solve a scalar, symmetric, positive-definite problem for the pressure correction q. This is the one genuinely global solve in the step, and §6 shows it is a Poisson problem.',
    cost: 'one scalar Poisson solve',
  },
  {
    index: 4,
    title: 'Pressure update',
    equation: 'pⁿ = pⁿ⁻¹ + α_R q + α_D M_p⁻¹ f_p',
    detail:
      'The additive preconditioner of §4, applied to the defect: the reactive part contributes q, the diffusive part contributes M_p⁻¹ f_p. The weights come straight from S, so α_R = α and α_D = θ₁νk. With the diffusive term dropped this is the classical projection update with relaxation α ∈ (0,2], typically 1.',
    cost: 'a diagonal solve and two vector updates',
  },
  {
    index: 5,
    title: 'Velocity projection',
    equation: 'uⁿ = ũⁿ − k Mₗ⁻¹ B q',
    detail:
      'Correct the intermediate velocity by the discrete gradient of the pressure correction. Mₗ is diagonal, so this costs nothing beyond a matrix–vector product.',
    cost: 'one sparse product against a diagonal matrix',
  },
]

export function AlgorithmSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>The PP algorithm</h2>
        <span className="badge">§5</span>
      </div>

      <p className="small-note">
        Everything is now in place. The projection scheme applies <strong>exactly one</strong> basic
        iteration per time step, with C⁻¹ the additive reactive-plus-diffusive preconditioner. Written
        out, that one iteration is five substeps.
      </p>

      <ol className="algorithm-steps">
        {STEPS.map((step) => (
          <li key={step.index}>
            <div className="algorithm-step-head">
              <span className="algorithm-step-index">{step.index}</span>
              <h3>{step.title}</h3>
              <span className="badge">{step.cost}</span>
            </div>
            <p className="math-block">{step.equation}</p>
            <p className="small-note">{step.detail}</p>
          </li>
        ))}
      </ol>

      <AlgorithmFlow />

      <h3>Why the result is divergence-free</h3>
      <p className="small-note">
        Step 5 is not an approximation. Apply Bᵀ to it and use the definitions of f_p and R:
      </p>
      <p className="math-block">Bᵀuⁿ = Bᵀũⁿ − k (BᵀMₗ⁻¹B) q = k f_p − k R q = k f_p − k f_p = 0</p>
      <p className="small-note">
        The discrete continuity equation is satisfied <strong>exactly</strong>. What is given up is
        the momentum equation: uⁿ and pⁿ satisfy it only approximately, because the velocity
        correction used Mₗ⁻¹ where the exact relation u = S⁻¹(g − kBp) asks for S⁻¹. That trade —
        continuity exact, momentum approximate — is the defining property of the scheme, and it is
        also why more than one iteration per time step would be needed to recover the fully coupled
        solution.
      </p>

      <ProjectionSplitFigure />

      <div className="note-grid">
        <article>
          <h3>Chorin or Van Kan</h3>
          <p className="small-note">
            The variants differ only in which old pressure enters step 1:
          </p>
          <ul className="compact-list">
            <li>
              <strong>p_old = 0</strong> — the discrete analogue of Chorin's scheme, first order.
            </li>
            <li>
              <strong>p_old = pⁿ⁻¹</strong> — Van Kan's scheme, second order in time.
            </li>
            <li>
              <strong>p_old = 2pⁿ − pⁿ⁻¹</strong> — higher-order extrapolation. Turek reports this
              works badly once time steps vary or meshes are non-equidistant, contradicting results
              obtained on uniform grids with small explicit time steps.
            </li>
          </ul>
        </article>
        <article>
          <h3>Nonlinear, semi-implicit, semi-explicit</h3>
          <p className="small-note">
            The three practical variants differ only in step 1. Solving the nonlinear Burgers problem
            treats convection exactly (given the old pressure). Linearizing it gives a convection–
            diffusion solve — the discrete counterpart of Chorin's and Van Kan's classical schemes,
            and of Gresho's discrete projection-2. Treating convection fully explicitly is cheapest
            per step and carries a hidden CFL restriction. Steps 2 to 5 are identical in all three.
          </p>
        </article>
      </div>
    </section>
  )
}
