import { formatNumber } from '../shared.ts'

export function SolveStageView({
  solution,
  centerNodeId,
  centerValue,
}: {
  solution: number[]
  centerNodeId: number
  centerValue: number
}) {
  const preview = solution.slice(0, 12)

  return (
    <section className="panel-card stage-view">
      <h2>Linear solve</h2>
      <p>
        The prototype assembles a sparse matrix but solves the constrained system with a
        dense direct elimination stage. This keeps the algebra structure visible while staying
        robust on small educational meshes.
      </p>
      <div className="note-grid">
        <article>
          <h3>Solution vector preview</h3>
          <ul className="compact-list">
            {preview.map((value, index) => (
              <li key={index}>
                u[{index}] = {formatNumber(value)}
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h3>Reference statistic</h3>
          <ul className="compact-list">
            <li>Nearest node to center: {centerNodeId}</li>
            <li>u(center-nearest node) = {formatNumber(centerValue)}</li>
            <li>All boundary values remain zero after constraint application.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
