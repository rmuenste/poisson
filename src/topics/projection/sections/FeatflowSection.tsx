const MAPPING = [
  {
    step: '1',
    here: 'S ũ = g − k B pⁿ⁻¹, two dense solves',
    there: 'thstep = tstep*(1−theta) assembles the explicit right hand side, AddPressureGradient() adds the k B p term, then thstep = tstep*theta builds the implicit operator and DO INL=1,NLmax runs a defect-correction loop around a multigrid solve.',
    file: 'QuadSc_main.f90:97, :142, :176',
  },
  {
    step: '2',
    here: 'f_p = (1/k) Bᵀũ',
    there: 'Matdef_General_LinScalar(LinSc,QuadSc,PLinSc,1), whose comment in the source reads "RHS=1/k B^T U~".',
    file: 'QuadSc_main.f90:254',
  },
  {
    step: '3',
    here: 'R q = f_p with R = BᵀMₗ⁻¹B, dense LU',
    there: 'Solve_General_LinScalar, logged as " Pressure-Poisson equation". The operator is built once by Get_CMat and announced during setup as "[B{T} MRho{-1} B]".',
    file: 'QuadSc_main.f90:268, QuadSc_proj.f:129',
  },
  {
    step: '4',
    here: 'pⁿ = pⁿ⁻¹ + α_R q + α_D M_p⁻¹ f_p',
    there: 'Pressure_Correction(): valP = valP + valP_old is the α_R = 1 term, and AddDiffPrec(P1iMMat, rhsP, …, daux) with daux = THSTEP*(GAMMA + ν) is the α_D M_p⁻¹ f_p term, gated on GAMMA > 0.',
    file: 'QuadSc_corrections.f90:43',
  },
  {
    step: '5',
    here: 'uⁿ = ũ − k Mₗ⁻¹ B q',
    there: 'Velocity_Correction(), carrying the comment "Update of U = U~ - k M^-1 B P" and dividing through by the lumped mass diagonal MlRhoPmat.',
    file: 'QuadSc_corrections.f90:12',
  },
]

export function FeatflowSection() {
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>The same step in production</h2>
        <span className="badge">§9</span>
      </div>

      <p className="small-note">
        The example in §8 is a teaching implementation: dense, serial, two
        dimensions, Stokes. FEATFLOW's <code>QuadSc_main.f90</code> is the same
        algorithm at production scale — three dimensions, MPI-parallel, multigrid,
        with moving meshes and immersed particles. The five substeps survive the
        translation intact, and the Fortran comments name them.
      </p>

      <div className="mapping-list">
        {MAPPING.map((entry) => (
          <article className="mini-card mapping-entry" key={entry.step}>
            <div className="algorithm-step-head">
              <span className="algorithm-step-index">{entry.step}</span>
              <h3>{entry.here}</h3>
            </div>
            <p className="small-note">{entry.there}</p>
            <p className="mapping-file">{entry.file}</p>
          </article>
        ))}
      </div>

      <h3>What production adds</h3>
      <div className="note-grid">
        <article>
          <h3>Different in kind</h3>
          <ul className="compact-list">
            <li>
              <strong>Q2/P1-discontinuous</strong> instead of Q̃1/Q0 — higher
              order, and the mass matrix must be lumped rather than arriving
              diagonal.
            </li>
            <li>
              <strong>Density-weighted mass</strong> (MlRhoPmat), so the same code
              handles variable density.
            </li>
            <li>
              <strong>Step 1 is a nonlinear loop</strong> to a tolerance, not one
              solve: convection is present, and Turek's adaptive fixed-point defect
              correction sits inside the projection step.
            </li>
            <li>
              <strong>Multigrid everywhere</strong> rather than dense LU — which is
              only possible because P is assembled explicitly, exactly as §6 argues.
            </li>
          </ul>
        </article>
        <article>
          <h3>Different in degree</h3>
          <ul className="compact-list">
            <li>
              A <code>1.5·pⁿ − 0.5·pⁿ⁻¹</code> pressure extrapolation feeds the next
              step — a gentler relative of the extrapolation §5 warns about.
            </li>
            <li>
              No-slip DOFs are eliminated inside <code>Get_CMat</code> itself, the
              same elimination the example performs when building P.
            </li>
            <li>
              ALE mesh motion, fictitious boundaries for particles, and force
              integration wrap the step.
            </li>
          </ul>
        </article>
      </div>

      <h3>A note on the name</h3>
      <p className="small-note">
        That code is often described as a fractional-step-θ scheme. The splitting
        is fractional-step in Chorin's sense — that is exactly what this topic has
        described — but the time discretization is the one-step-θ scheme of §2:
        THETA is a single constant read once from the input file (CN → 1/2,
        BE → 1, FE → 0), and each time step calls the transport routine once.
        The three-substep Fractional-Step-θ machinery does exist in the legacy
        layer, but its switch is forced off. Worth knowing when reading either the
        code or the notes around it.
      </p>
    </section>
  )
}
