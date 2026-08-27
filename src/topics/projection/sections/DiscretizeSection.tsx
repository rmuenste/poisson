import { ElementPairFigure } from '../figures/ElementPairFigure.tsx'
import { SaddlePointBlocks } from '../figures/SaddlePointBlocks.tsx'

export function DiscretizeSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>One-Step-θ in time, finite elements in space</h2>
        <span className="badge">§2</span>
      </div>

      <p className="small-note">
        Time and space are discretized separately and independently. That separation is the whole
        point: it leaves a single steady, Navier–Stokes-like algebraic problem to be solved once per
        time step, and every scheme that follows is a way of solving <em>that</em>.
      </p>

      <h3>Step 1 — discretize in time</h3>
      <p className="small-note">
        Two of the terms in the momentum equation always travel together in what follows, so they
        get a shared name:
      </p>
      <p className="math-block">N(v)u := −νΔu + v·∇u</p>

      <div className="note-grid">
        <article>
          <h3>−νΔu — the diffusive part</h3>
          <p className="small-note">
            Viscous friction. It is the Laplacian of the velocity scaled by the viscosity ν, and it
            spreads momentum out, smoothing differences between neighbouring bits of fluid. It is
            the same operator the Poisson topic assembles — linear, symmetric, and well behaved.
            Large ν means a thick, syrupy fluid where this term dominates.
          </p>
        </article>
        <article>
          <h3>v·∇u — the convective part</h3>
          <p className="small-note">
            Transport: the fluid carries its own momentum along as it moves. This is the term that
            makes the equations <em>nonlinear</em>, because the velocity being transported is also
            the velocity doing the transporting — v is u itself. It is the source of essentially
            every difficulty in the rest of this topic, and the reason §4 ends with an open problem.
          </p>
        </article>
      </div>

      <p className="small-note">
        Writing N(v)u keeps the two apart notationally: the argument v is the field doing the
        transporting. Setting v = u gives the true nonlinear operator; freezing v at a known field
        gives the linearized (Oseen) one. Everything below holds for both.
      </p>

      <p className="small-note">
        The One-Step-θ family then advances from tⁿ to tⁿ⁺¹ by
      </p>
      <p className="math-block">
        [I + θkN(u)]u + k∇p = [I − θ₁kN(uⁿ)]uⁿ + θ₂k f ⁿ⁺¹ + θ₃k f ⁿ,   ∇·u = 0
      </p>
      <p className="small-note">
        with u = uⁿ⁺¹, p = pⁿ⁺¹ and k the time step. Here <strong>f is the external force per unit
        volume</strong> driving the flow — gravity, buoyancy, a pump, whatever pushes the fluid from
        outside. It is data, known in advance, not something being solved for. It appears twice
        because a θ-scheme evaluates the force at both ends of the step: f ⁿ⁺¹ at the new time level
        and f ⁿ at the old one, weighted by θ₂ and θ₃. For a flow driven only by its boundary
        conditions — a channel with fluid pushed in at one end — f is simply zero and both terms
        vanish.
      </p>
      <p className="small-note">
        The pattern of the equation is worth reading once: everything at the new time level sits on
        the left, everything already known sits on the right. θ = 1 gives backward Euler, θ = 1/2
        gives Crank–Nicolson; the Fractional-Step-θ scheme is three such substeps with different
        weights. Note what has already happened: the constraint ∇·u = 0 is imposed at the{' '}
        <em>new</em> time level, so the problem to be solved at each step is still a coupled
        saddle-point problem, not an explicit update.
      </p>

      <h3>Step 2 — discretize in space</h3>
      <p className="small-note">
        The velocity and pressure spaces cannot be chosen independently. They must satisfy the
        Babuška–Brezzi condition with a mesh-independent constant, or the pressure is not controlled
        by the velocity and the discrete problem is unstable. Turek's choice is the nonconforming
        rotated bilinear velocity with piecewise constant pressure — the Q̃1/Q0 pair.
      </p>

      <ElementPairFigure />

      <div className="note-grid">
        <article>
          <h3>Why this pair</h3>
          <ul className="compact-list">
            <li>Babuška–Brezzi stable, including on strongly anisotropic meshes.</li>
            <li>Admits simple upwinding, with M-matrix properties for the transport part.</li>
            <li>Small bandwidth — 11 in 3D, against 125 or more for conforming triquadratics.</li>
            <li>Gives the cheapest, most compact pressure operator, as §6 shows.</li>
          </ul>
        </article>
        <article>
          <h3>What matters downstream</h3>
          <p className="small-note">
            Only two properties of the element pair are actually used later: that it is stable, and
            that its velocity mass matrix is diagonal — or can be lumped into a diagonal matrix Mₗ
            without losing accuracy. §6 shows why that second property is not a convenience but a
            requirement.
          </p>
        </article>
      </div>

      <h3>What comes out</h3>
      <p className="small-note">
        Using the same symbols for the functions and for their coefficient vectors, one time step is
        the algebraic system
      </p>
      <p className="math-block">S u + k B p = g,   Bᵀu = 0</p>
      <p className="small-note">
        where B is the gradient matrix and Bᵀ the divergence matrix. Collecting the mass, diffusive
        and convective contributions, the velocity matrix has the structure
      </p>
      <p className="math-block">S = αM + θ₁νkL + θ₂kK(u)</p>
      <p className="math-block">g = [M − θ₁kN(uⁿ)]uⁿ + θ₂k f ⁿ⁺¹ + θ₃k f ⁿ</p>
      <p className="small-note">
        with M the mass matrix, L the discrete Laplacian and K the transport matrix. The parameter
        α is 1 in the nonstationary case and 0 for stationary problems, where k and the θᵢ can then
        be set to 1. K depends on a given field for Oseen problems and on the unknown u itself in
        the fully nonlinear case — a distinction that matters in §5 and nowhere before it.
      </p>

      <SaddlePointBlocks />

      <p className="small-note">
        This block system is the object every remaining section works on. It is large, coupled, and
        indefinite: the missing pressure–pressure block means it has both positive and negative
        eigenvalues, so the standard toolkit for definite problems does not apply to it directly.
      </p>
    </section>
  )
}
