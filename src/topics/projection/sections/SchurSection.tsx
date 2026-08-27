import { SchurElimination } from '../figures/SchurElimination.tsx'

export function SchurSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>Eliminating the velocity</h2>
        <span className="badge">§3</span>
      </div>

      <p className="small-note">
        The block system couples u and p, but the coupling is one-sided in a useful way: the first
        row can be solved for u as soon as p is known. Assuming S⁻¹ exists,
      </p>
      <p className="math-block">u = S⁻¹(g − kBp)</p>
      <p className="small-note">Substituting that into the constraint Bᵀu = 0 leaves</p>
      <p className="math-block">BᵀS⁻¹B p = (1/k) BᵀS⁻¹ g</p>
      <p className="small-note">
        which is an equation in the pressure alone. Naming the pieces,
      </p>
      <p className="math-block">A p = f,   A := BᵀS⁻¹B,   f := (1/k) BᵀS⁻¹g</p>

      <SchurElimination />

      <p className="small-note">
        A is the <strong>pressure Schur complement</strong>. The original coupled, indefinite
        saddle-point problem has become a scalar problem in p — and once p is known, the velocity
        follows from the formula above without any further coupling.
      </p>

      <div className="note-grid">
        <article>
          <h3>What this does not buy</h3>
          <p className="small-note">
            The reformulation is exact, not cheap. S⁻¹ is a full matrix, so A cannot be assembled;
            every application of A to a vector requires solving a velocity subproblem with S. Turek
            is explicit that no work has been saved by the elimination itself.
          </p>
        </article>
        <article>
          <h3>What it does buy</h3>
          <p className="small-note">
            The pressure problem is now <em>scalar</em> and <em>definite</em>. Everything numerical
            analysis knows about iterating on such problems becomes available, and iterative methods
            need only matrix–vector products — which is exactly what applying A amounts to. The
            difficulties behind B, S⁻¹ and Bᵀ can be set aside and picked up again as a question
            about preconditioning.
          </p>
        </article>
      </div>
    </section>
  )
}
