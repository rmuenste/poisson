export function EquationsSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>The incompressible Navier–Stokes equations</h2>
        <span className="badge">§1</span>
      </div>

      <p className="math-block">uₜ − νΔu + u·∇u + ∇p = f,   ∇·u = 0</p>

      <dl className="term-list">
        <dt>uₜ</dt>
        <dd>how the velocity changes with time</dd>
        <dt>−νΔu</dt>
        <dd>diffusion — viscous friction smoothing the flow, with viscosity ν</dd>
        <dt>u·∇u</dt>
        <dd>convection — the fluid carrying its own momentum along; the nonlinear term</dd>
        <dt>∇p</dt>
        <dd>the pressure gradient pushing the fluid</dd>
        <dt>f</dt>
        <dd>external force per unit volume — gravity, a pump; known data, often zero</dd>
        <dt>∇·u = 0</dt>
        <dd>incompressibility — no fluid is created or destroyed anywhere</dd>
      </dl>

      <p className="small-note">
        Two unknowns, two equations — but they are not the same kind of equation. The first is an
        evolution equation for the velocity: given the state now, it says how u changes. The second
        is not an evolution equation for anything. It is a constraint that the velocity must satisfy
        at every instant, and the pressure is what enforces it.
      </p>

      <div className="note-grid">
        <article>
          <h3>Pressure has no equation of its own</h3>
          <p className="small-note">
            There is no ∂p/∂t anywhere in the system. The pressure acts as a Lagrange multiplier for
            the constraint ∇·u = 0: it takes whatever value is needed, instantaneously, to keep the
            velocity divergence-free. That is why an incompressible flow solver cannot simply march
            both variables forward in time, and why every scheme in this topic is really a scheme
            for finding p.
          </p>
        </article>
        <article>
          <h3>One machinery, several problems</h3>
          <p className="small-note">
            Turek treats a whole family with the same tools, because after discretization they all
            produce the same algebraic shape:
          </p>
          <ul className="compact-list">
            <li>nonstationary Navier–Stokes</li>
            <li>stationary (generalized) Navier–Stokes</li>
            <li>Oseen — convection linearized around a given field U</li>
            <li>Stokes — convection dropped entirely</li>
            <li>divergence-free L² projections</li>
          </ul>
        </article>
      </div>

      <p className="small-note">
        The next section discretizes the first of these. Everything afterwards works on the
        algebraic system that comes out, so it applies to all of them.
      </p>
    </section>
  )
}
