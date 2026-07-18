export function ProblemStageView({ equation, weakForm }: { equation: string; weakForm: string }) {
  return (
    <section className="panel-card stage-view">
      <h2>Problem definition</h2>
      <p className="math-block">{equation}</p>
      <p>{weakForm}</p>
      <div className="note-grid">
        <article>
          <h3>Prototype choices</h3>
          <ul className="compact-list">
            <li>Unit square geometry.</li>
            <li>P1 triangle or Q1 quadrilateral basis functions (switchable).</li>
            <li>Homogeneous Dirichlet boundary treatment.</li>
            <li>Configurable quadrature with default stage services.</li>
          </ul>
        </article>
        <article>
          <h3>Replaceable services</h3>
          <ul className="compact-list">
            <li>Mesh generator</li>
            <li>Mesh refiner</li>
            <li>Quadrature rule</li>
            <li>Linear solver</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
