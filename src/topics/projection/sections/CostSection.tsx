export function CostSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>What it costs, and when it wins</h2>
        <span className="badge">§7</span>
      </div>

      <h3>Per time step</h3>
      <p className="math-block">2 transport–diffusion solves + 1 Pressure-Poisson solve   (in 2D)</p>
      <p className="small-note">
        Everything else in the five substeps is a sparse matrix–vector product or a diagonal solve.
        That is a small, predictable cost per step, and all three solves are scalar problems for
        which robust multigrid machinery already exists — no saddle-point solver is needed anywhere.
      </p>

      <div className="note-grid">
        <article>
          <h3>What is guaranteed</h3>
          <ul className="compact-list">
            <li>The discrete continuity equation holds exactly.</li>
            <li>The discrete momentum equation holds only approximately.</li>
            <li>
              The reactive preconditioner becomes an almost exact solver as k → 0, so accuracy
              improves as time steps shrink.
            </li>
          </ul>
        </article>
        <article>
          <h3>What is not</h3>
          <ul className="compact-list">
            <li>
              No convective preconditioner exists, so performance degrades at medium Reynolds
              numbers where convection dominates.
            </li>
            <li>
              Time steps must be smaller than a fully coupled scheme would need — the cheapness per
              step is partly paid back in step count.
            </li>
            <li>
              Rigorous error control in time is not available for this branch; Turek is explicit that
              it remains open.
            </li>
          </ul>
        </article>
      </div>

      <h3>Where it stands against the coupled branch</h3>
      <p className="small-note">
        The alternative is to keep the saddle-point system coupled and treat the nonlinearity as the
        outer iteration — the Galerkin branch, FEATFLOW's CC2D. Turek's numerical comparisons put the
        two like this:
      </p>
      <ul className="compact-list">
        <li>
          <strong>Fully nonstationary, convection-dominated flow on complex domains</strong> —
          projection wins, and is cheapest. This is the scheme Turek ran in the 1995 DFG
          flow-around-a-cylinder benchmark.
        </li>
        <li>
          <strong>Large viscosity, large time steps, strongly anisotropic meshes</strong> — pure
          one-step projection can fail badly, and the fully nonlinear coupled scheme is the only
          robust candidate.
        </li>
        <li>
          <strong>Varying Reynolds number</strong> — no fixed scheme is best throughout; switching
          adaptively between the two is.
        </li>
      </ul>
      <p className="small-note">
        The schemes are comparable at all because both are solvers for the same discrete problem
        Su + kBp = g, Bᵀu = 0 — which was the point of deriving them from one framework.
      </p>

      <article className="mini-card">
        <h3>Next</h3>
        <p className="small-note">
          A worked example: the five substeps carried out on a small system, with the matrices
          written out and the divergence checked at every step.
        </p>
      </article>
    </section>
  )
}
