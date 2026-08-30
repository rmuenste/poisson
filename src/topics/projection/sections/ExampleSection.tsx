import type { ProjectionRunTrace } from '../../../core/tracing/projectionTraces.ts'
import { euclideanNorm } from '../../../core/projection/operators.ts'
import { CellGrid } from '../example/CellGrid.tsx'
import { FlowFieldFigure } from '../example/FlowFieldFigure.tsx'
import { MatrixGrid } from '../example/MatrixGrid.tsx'
import { formatNorm } from '../example/format.ts'

export function ExampleSection({ run }: { run: ProjectionRunTrace }) {
  const { mesh, operators, config } = run
  const step = run.steps[run.steps.length - 1]
  const n = mesh.divisions
  // A cell away from the walls, so its row of P shows the full stencil.
  const interiorCell =
    mesh.cells.find(
      (cell) => cell.i > 0 && cell.i < n - 1 && cell.j > 0 && cell.j < n - 1,
    ) ?? mesh.cells[Math.floor(mesh.cells.length / 2)]
  const velocityDofs = 2 * mesh.edges.length
  const freeDofs = 2 * mesh.freeEdgeIds.length

  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <h2>A worked example</h2>
        <span className="badge">§8</span>
      </div>

      <p className="small-note">
        The five substeps, carried out on a system small enough to print every
        number. Everything below is computed in the browser by the same code the
        tests exercise — nothing is precomputed or illustrative. Use the sidebar
        controls to change the mesh, the viscosity, the time step or θ and watch
        every quantity move.
      </p>

      <h3>The system</h3>
      <div className="note-grid">
        <article>
          <h3>Discretization</h3>
          <ul className="compact-list">
            <li>
              {n}×{n} uniform cells on the unit square, h = 1/{n}
            </li>
            <li>
              Q̃1/Q0: velocity on {mesh.edges.length} edges ({velocityDofs} DOFs,{' '}
              {freeDofs} free), pressure on {mesh.cells.length} cells
            </li>
            <li>No-slip on every boundary edge; the flow is enclosed</li>
            <li>Body force f = (sin πx · sin πy, 0) — a push to the right</li>
          </ul>
        </article>
        <article>
          <h3>Two simplifications</h3>
          <p className="small-note">
            The convective term is dropped, so this is generalized Stokes and
            S = M + θνkL is linear. There is therefore no nonlinear loop around
            step 1 — that is exactly where FEATFLOW's defect-correction iteration
            sits, as §9 shows. The force is deliberately <em>not</em>{' '}
            divergence-free: a solenoidal force would leave ũ divergence-free on
            its own and the projection would have nothing to do.
          </p>
        </article>
      </div>

      <h3>The operator of step 3</h3>
      <p className="small-note">
        P = BᵀMₗ⁻¹B, assembled explicitly and printed in full ({mesh.cells.length}×
        {mesh.cells.length}). This is the claim of §6 as a table of numbers: 8 on
        the diagonal of an interior cell, −2 to each of its four neighbours, five
        non-zeros per row and nothing else — twice the familiar 5-point stencil.
        Cells on the boundary show a smaller diagonal because their wall edges are
        no-slip and drop out, which is the natural boundary condition for the
        pressure.
      </p>
      {mesh.cells.length <= 25 ? (
        <MatrixGrid matrix={operators.pressurePoisson} />
      ) : (
        <p className="small-note">
          At {mesh.cells.length} cells the full matrix is too wide to print here —
          reduce the mesh to 5×5 or smaller in the sidebar to see it. The row below
          shows the stencil either way.
        </p>
      )}
      <CellGrid
        values={operators.pressurePoisson[interiorCell.id]}
        divisions={n}
        label={`One row of P, for the interior cell (${interiorCell.i}, ${interiorCell.j}), laid out on the mesh — the 5-point stencil itself`}
      />
      <p className="small-note">
        Every row sums to zero, so P is singular: for an enclosed flow the
        pressure is only defined up to a constant. The solve pins one cell and
        shifts the result back to zero mean. Since B applied to a constant
        vanishes on every free edge, that choice leaves the velocity correction
        untouched.
      </p>

      <h3>One time step, substep by substep</h3>
      <p className="small-note">
        Showing step {step.index} of {run.steps.length}, at t = {step.time.toFixed(3)}.
      </p>

      <ol className="algorithm-steps">
        <li>
          <div className="algorithm-step-head">
            <span className="algorithm-step-index">1</span>
            <h3>Intermediate velocity</h3>
            <span className="badge">2 solves of size {mesh.edges.length}</span>
          </div>
          <p className="math-block">S ũ = g − k B pⁿ⁻¹</p>
          <p className="small-note">
            S = M + θνkL is the same matrix for both components, so this is one
            factorization and two solves — the "one solve per velocity component"
            of §5. The result ignores incompressibility completely.
          </p>
          <FlowFieldFigure
            mesh={mesh}
            u={step.intermediateU}
            v={step.intermediateV}
            caption="ũ — the intermediate velocity. It obeys momentum but not continuity."
          />
        </li>

        <li>
          <div className="algorithm-step-head">
            <span className="algorithm-step-index">2</span>
            <h3>Defect</h3>
            <span className="badge">‖Bᵀũ‖ = {formatNorm(step.divergenceNormBefore)}</span>
          </div>
          <p className="math-block">f_p = (1/k) Bᵀ ũ</p>
          <p className="small-note">
            The discrete divergence of ũ, cell by cell. The force pushes right, so
            fluid leaves the left column and piles into the right one — positive
            divergence on the left, negative on the right, zero down the middle.
            By the identity of §4 this is the residual of the pressure equation,
            and dividing by k turns it into f_p.
          </p>
          <div className="grid-pair">
            <CellGrid values={step.divergenceBefore} divisions={n} label="Bᵀũ per cell" />
            <CellGrid values={step.defect} divisions={n} label={`f_p = Bᵀũ / k, k = ${config.timeStep}`} />
          </div>
        </li>

        <li>
          <div className="algorithm-step-head">
            <span className="algorithm-step-index">3</span>
            <h3>Pressure-Poisson solve</h3>
            <span className="badge">residual {formatNorm(step.poissonResidualNorm)}</span>
          </div>
          <p className="math-block">R q = f_p,   R = P = BᵀMₗ⁻¹B</p>
          <p className="small-note">
            The pressure correction: high where fluid is being lost, low where it
            is arriving, so that its gradient pushes back against the imbalance.
          </p>
          <CellGrid values={step.pressureCorrection} divisions={n} label="q" />
        </li>

        <li>
          <div className="algorithm-step-head">
            <span className="algorithm-step-index">4</span>
            <h3>Pressure update</h3>
            <span className="badge">
              α_R = 1, α_D ={' '}
              {config.useDiffusivePreconditioner
                ? (config.theta * config.viscosity * config.timeStep).toExponential(1)
                : '0'}
            </span>
          </div>
          <p className="math-block">pⁿ = pⁿ⁻¹ + α_R q + α_D M_p⁻¹ f_p</p>
          <p className="small-note">
            {config.useDiffusivePreconditioner
              ? 'The diffusive term is on: α_D = θνk from the additive preconditioner of §4, with M_p the diagonal pressure mass matrix. It changes the pressure but not the velocity, since only q enters step 5.'
              : 'The diffusive term is off, so this reduces to the classical projection update pⁿ = pⁿ⁻¹ + q. Turn it on in the sidebar to add α_D M_p⁻¹ f_p — it shifts the pressure without touching the velocity.'}
          </p>
          <CellGrid values={step.pressure} divisions={n} label="pⁿ" />
        </li>

        <li>
          <div className="algorithm-step-head">
            <span className="algorithm-step-index">5</span>
            <h3>Velocity projection</h3>
            <span className="badge">‖Bᵀuⁿ‖ = {formatNorm(step.divergenceNormAfter)}</span>
          </div>
          <p className="math-block">uⁿ = ũ − k Mₗ⁻¹ B q</p>
          <p className="small-note">
            Mₗ is diagonal, so this is a scaling and a subtraction — no solve.
          </p>
          <FlowFieldFigure
            mesh={mesh}
            u={step.velocityU}
            v={step.velocityV}
            pressure={step.pressure}
            caption="uⁿ after the projection, over the pressure field. The recirculation the walls demand has appeared."
          />
        </li>
      </ol>

      <h3>The check</h3>
      <div className="summary-grid">
        <div className="stat-card">
          <span>‖Bᵀũ‖ before</span>
          <strong>{formatNorm(step.divergenceNormBefore)}</strong>
        </div>
        <div className="stat-card">
          <span>‖Bᵀuⁿ‖ after</span>
          <strong>{formatNorm(step.divergenceNormAfter)}</strong>
        </div>
        <div className="stat-card">
          <span>‖uⁿ‖</span>
          <strong>{formatNorm(euclideanNorm(step.velocityU) + euclideanNorm(step.velocityV))}</strong>
        </div>
        <div className="stat-card">
          <span>Reduction</span>
          <strong>
            {step.divergenceNormAfter < 1e-15
              ? 'to machine zero'
              : `${(step.divergenceNormBefore / step.divergenceNormAfter).toExponential(1)}×`}
          </strong>
        </div>
      </div>
      <CellGrid values={step.divergenceAfter} divisions={n} label="Bᵀuⁿ per cell — every entry is rounding noise" />
      <p className="small-note">
        This is the trade of §5 made concrete. Continuity is satisfied to machine
        precision, not approximately, because step 5 was constructed to make it
        so. Momentum is not: uⁿ solves S ũ = g − kBpⁿ⁻¹ only before the correction
        was applied, and the correction used Mₗ⁻¹ where the exact relation asks for
        S⁻¹. Iterating the whole step to convergence would recover the coupled
        solution — one step is what makes this a projection scheme.
      </p>
    </section>
  )
}
