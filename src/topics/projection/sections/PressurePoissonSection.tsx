import { FivePointStencil } from '../figures/FivePointStencil.tsx'

export function PressurePoissonSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>Why step 3 is a Poisson problem</h2>
        <span className="badge">§6</span>
      </div>

      <p className="small-note">
        Step 3 inverts R = P = BᵀMₗ⁻¹B. Nothing so far has said what kind of operator that is. It
        turns out to be a discrete Laplacian — which is why the step is called a Pressure-Poisson
        problem, and why this topic connects back to the first one.
      </p>

      <h3>First, the mass matrix must be diagonal</h3>
      <p className="small-note">
        Mₗ must be diagonal for P to be formed at all. There are two routes to one, and Turek prefers
        the first:
      </p>
      <ul className="compact-list">
        <li>
          <strong>Quadrature matched to the degrees of freedom.</strong> Integrating the mass matrix
          with a rule whose points sit exactly at the element's degrees of freedom makes the
          off-diagonal entries vanish. For vertex-based elements that is the trapezoidal rule; for
          the edge-oriented nonconforming spaces, a midpoint/midface rule.
        </li>
        <li>
          <strong>Row-sum lumping.</strong> Collapse each row of M onto its diagonal.
        </li>
      </ul>
      <p className="small-note">
        The first route is the same trapezoidal rule already available in the Poisson topic's
        quadrature stage — there it is presented as one integration rule among several, and here it
        is the thing that makes the whole scheme possible.
      </p>

      <h3>Then, P is a Poisson stiffness matrix</h3>
      <p className="small-note">
        Consider the continuous Poisson problem −Δq = rhs. Introduce the flux v = −∇q and use
        rhs = −∇·∇q = ∇·v. That mixed formulation discretizes to
      </p>
      <p className="math-block stacked">
        {'[ Mₗ  B ] [ v ]   [  0  ]\n[ Bᵀ  0 ] [ q ] = [ rhs ]'}
      </p>
      <p className="small-note">
        Eliminating v from the first row gives v = −Mₗ⁻¹Bq, and substituting into the second gives
        BᵀMₗ⁻¹B q = rhs. The operator on the left is P. In other words, P is not merely
        Laplacian-<em>like</em>: it is the stiffness matrix of a mixed finite element formulation of
        the Poisson problem, one that works even for piecewise constant pressure, where a direct
        formulation would have nothing to differentiate.
      </p>

      <FivePointStencil />

      <p className="small-note">
        Assembled on an equidistant mesh with the nonconforming velocity and piecewise constant
        pressure, P reduces to the familiar 5-point stencil — up to the mesh-width scaling, the same
        operator the Poisson topic builds element by element.
      </p>

      <div className="note-grid">
        <article>
          <h3>Why form P explicitly</h3>
          <p className="small-note">
            One could apply BᵀMₗ⁻¹B as three successive products and never build the matrix. Turek
            builds it, once, in a preprocessing step, for two reasons. Storing and multiplying the
            compact P is cheaper than the product form, particularly for nonconforming elements. More
            importantly, an explicitly available matrix admits SOR and ILU smoothers and hence a
            robust multigrid solver; the product form admits only diagonal preconditioning. On
            anisotropic meshes that difference decides whether the solver works at all.
          </p>
        </article>
        <article>
          <h3>What the first topic already gives you</h3>
          <p className="small-note">
            The Poisson topic assembles a scalar, symmetric, positive-definite Laplacian with
            Dirichlet constraints and solves it. That is precisely the subproblem in step 3. The two
            topics meet here: one builds the operator, the other explains what an incompressible flow
            solver wants it for — once per time step, forever.
          </p>
        </article>
      </div>
    </section>
  )
}
