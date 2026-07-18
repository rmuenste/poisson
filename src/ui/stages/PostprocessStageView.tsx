import type { Mesh } from '../../core/fem/mesh.ts'
import type { ElementFieldSample } from '../../core/postprocess/postprocess.ts'
import { projectPoint, referenceCornerCount } from '../InteractiveMeshView.tsx'
import { colorForValue, elementLabel, formatNumber, formatPoint } from '../shared.ts'

export function PostprocessStageView({
  mesh,
  elementSamples,
  minValue,
  maxValue,
}: {
  mesh: Mesh
  elementSamples: ElementFieldSample[]
  minValue: number
  maxValue: number
}) {
  const elementNoun = elementLabel(mesh.elementKind, false).toLowerCase()
  const gradientNote =
    mesh.elementKind === 'triangle'
      ? 'Gradient samples are constant on each linear element and available for inspection.'
      : 'Gradient samples shown below are evaluated at the reference centroid of each element.'
  return (
    <section className="panel-card stage-view">
      <h2>Postprocessing</h2>
      <p>
        The final field is visualized per {elementNoun} using the average nodal value. {gradientNote}
      </p>
      <SolutionSvg mesh={mesh} elementSamples={elementSamples} minValue={minValue} maxValue={maxValue} />
      <div className="table-grid">
        {elementSamples.slice(0, 6).map((sample) => (
          <div key={sample.elementId} className="mini-card">
            <strong>Element #{sample.elementId}</strong>
            <span>avg u = {formatNumber(sample.averageValue)}</span>
            <span>∇u = {formatPoint(sample.gradient)}</span>
            <span>centroid = {formatPoint(sample.centroid)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SolutionSvg({
  mesh,
  elementSamples,
  minValue,
  maxValue,
}: {
  mesh: Mesh
  elementSamples: ElementFieldSample[]
  minValue: number
  maxValue: number
}) {
  const width = 460
  const height = 320
  const sampleMap = new Map(elementSamples.map((sample) => [sample.elementId, sample]))

  return (
    <svg className="solution-svg" viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} rx="22" />
      {mesh.elements.map((element) => {
        const sample = sampleMap.get(element.id)
        const color = sample ? colorForValue(sample.averageValue, minValue, maxValue) : '#d7e1ec'
        const cornerIds = element.nodeIds.slice(0, referenceCornerCount(mesh.elementKind))
        const points = cornerIds
          .map((id) => projectPoint(mesh.nodes[id].point, width, height))
          .map((point) => `${point.x},${point.y}`)
          .join(' ')

        return (
          <polygon
            key={element.id}
            points={points}
            fill={color}
            stroke="rgba(15, 27, 43, 0.3)"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}
