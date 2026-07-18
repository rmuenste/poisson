import type { ElementKind, Mesh } from '../../core/fem/mesh.ts'
import { InteractiveMeshView } from '../InteractiveMeshView.tsx'
import { elementLabel } from '../shared.ts'

export function MeshStageView({
  mesh,
  selectedElementId,
  refinementHistory,
  elementKind,
  onSelectElement,
}: {
  mesh: Mesh
  selectedElementId: number
  refinementHistory: Array<{ label: string; divisions: number; nodeCount: number; elementCount: number }>
  elementKind: ElementKind
  onSelectElement: (elementId: number) => void
}) {
  const elementsWord = elementLabel(elementKind, true).toLowerCase()
  const meshDescription = (() => {
    switch (elementKind) {
      case 'quad':
        return 'Structured square mesh of bilinear quadrilaterals with a dedicated uniform refinement service.'
      case 'quad-q2':
        return 'Structured square mesh of biquadratic quadrilaterals (9 nodes per element) with a dedicated uniform refinement service.'
      case 'triangle-p2':
        return 'Structured square triangulation with quadratic triangles (6 nodes per element) and a dedicated uniform refinement service.'
      case 'triangle':
        return 'Structured square triangulation with a dedicated uniform refinement service.'
    }
  })()
  return (
    <section className="panel-card stage-view">
      <div className="section-heading">
        <div>
          <h2>Mesh and refinement</h2>
          <p>{meshDescription}</p>
        </div>
        <span className="badge">selected element #{selectedElementId}</span>
      </div>
      <InteractiveMeshView
        mesh={mesh}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
      />
      <p className="small-note">
        Click an element to select it, or hover for its node ids. The sidebar slider stays in
        sync.
      </p>
      <div className="table-grid">
        {refinementHistory.map((entry) => (
          <div key={entry.label} className="mini-card">
            <strong>{entry.label}</strong>
            <span>{entry.divisions} x {entry.divisions} cells</span>
            <span>{entry.nodeCount} nodes</span>
            <span>{entry.elementCount} {elementsWord}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
