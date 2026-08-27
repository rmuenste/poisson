const FAMILY = [
  {
    scheme: 'Projection (Chorin, Van Kan, Gresho)',
    preconditioner: 'C = Δ_h, the discrete Laplacian',
    note: 'Exactly one iteration per time step. This is the PP branch.',
  },
  {
    scheme: 'Pressure correction / SIMPLE',
    preconditioner: 'C = BᵀS̃⁻¹B with S̃ = diag(S) or a row-sum diagonal',
    note: 'The same preconditioner, iterated several times per step.',
  },
  {
    scheme: 'Uzawa',
    preconditioner: 'C = σI or C = σM_p',
    note: 'The crudest choice: a scaled identity or pressure mass matrix.',
  },
  {
    scheme: 'Vanka smoother',
    preconditioner: 'exact local solves on small patches of cells',
    note: 'Local rather than global — the basis of the coupled CC2D branch.',
  },
]

export function IterationSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>One preconditioned Richardson step</h2>
        <span className="badge">§4</span>
      </div>

      <p className="small-note">
        With A p = f in hand, the most general thing to do is a preconditioned Richardson iteration.
        Turek calls it the <strong>basic iteration</strong>:
      </p>
      <p className="math-block">pˡ = pˡ⁻¹ − C⁻¹(A pˡ⁻¹ − f)</p>
      <p className="math-block">pˡ = pˡ⁻¹ − C⁻¹(BᵀS⁻¹B pˡ⁻¹ − (1/k) BᵀS⁻¹g)</p>

      <p className="small-note">
        This single line is the unifying result of the chapter. A large number of schemes that look
        nothing alike in their usual presentation are this iteration with different choices of C.
      </p>

      <div className="table-grid">
        {FAMILY.map((entry) => (
          <article className="mini-card" key={entry.scheme}>
            <h3>{entry.scheme}</h3>
            <p className="math-block small">{entry.preconditioner}</p>
            <p className="small-note">{entry.note}</p>
          </article>
        ))}
      </div>

      <h3>The identity everything rests on</h3>
      <p className="small-note">
        Take one step from pⁿ⁻¹ and look at the residual. Writing ũ for the velocity that solves
        S ũ = g − kBpⁿ⁻¹ — that is, ũ = S⁻¹(g − kBpⁿ⁻¹) — the residual is
      </p>
      <p className="math-block">f − A pⁿ⁻¹ = (1/k) BᵀS⁻¹g − BᵀS⁻¹B pⁿ⁻¹</p>
      <p className="math-block">= (1/k) Bᵀ[S⁻¹(g − kB pⁿ⁻¹)] = (1/k) Bᵀ ũ</p>
      <p className="small-note">
        <strong>The residual of the pressure equation is the discrete divergence of the intermediate
        velocity.</strong> This is why the algorithm in §5 computes a provisional velocity and then
        takes its divergence: that is not a heuristic fix-up, it is a defect evaluation. It also
        explains the cost — one application of A costs one velocity solve, and here that solve is
        the one producing ũ.
      </p>

      <h3>Choosing C</h3>
      <p className="small-note">
        A good preconditioner should mimic BᵀS⁻¹B. Since S = αM + θ₁νkL + θ₂kK is a sum of three
        parts, Turek builds C⁻¹ additively from the corresponding three pieces:
      </p>
      <p className="math-block">
        [BᵀS⁻¹B]⁻¹ ≈ α[BᵀM⁻¹B]⁻¹ + θ₁νk[BᵀL⁻¹B]⁻¹ + θ₂k[BᵀK⁻¹B]⁻¹
      </p>

      <div className="note-grid">
        <article>
          <h3>The two that work</h3>
          <ul className="compact-list">
            <li>
              <strong>Reactive</strong>: A_R = P = BᵀMₗ⁻¹B, using the lumped velocity mass matrix.
              It becomes an almost exact solver as k → 0, which is why projection schemes do well at
              small time steps. §6 shows what this operator really is.
            </li>
            <li>
              <strong>Diffusive</strong>: A_D = M_p, the pressure mass matrix — diagonal for Q0
              pressure. It gives mesh-independent multigrid rates and connects to the classical
              Cahouet–Glowinski Stokes preconditioner.
            </li>
          </ul>
        </article>
        <article>
          <h3>The one that does not</h3>
          <p className="small-note">
            For the convective part BᵀK⁻¹B, Turek reports that no satisfactory construction is
            known — discrete or continuous — and calls it an open problem. It is dropped from the
            practical scheme. That omission is not cosmetic: it is precisely why the global approach
            is strong for Stokes-like and highly nonstationary regimes and degrades at medium
            Reynolds numbers, where convection dominates.
          </p>
        </article>
      </div>
    </section>
  )
}
