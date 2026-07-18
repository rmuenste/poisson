import * as React from 'react'
import type { ElementKind, Mesh, Vector2 } from '../../core/fem/mesh.ts'
import { InteractiveMeshView } from '../InteractiveMeshView.tsx'
import {
  elementLabel,
  elementOrderLabel,
  formatMatrix2,
  formatNumber,
  formatPoint,
  formatVector,
  isHigherOrder,
  isQuadKind,
  subscript,
} from '../shared.ts'

export type AssemblySampleTrace = {
  referencePoint: Vector2
  physicalPoint: Vector2
  weight: number
  shapeValues: number[]
  sourceValue: number
  jacobian: [[number, number], [number, number]]
  determinant: number
  inverseTranspose: [[number, number], [number, number]]
  physicalGradients: Vector2[]
}

export type AssemblyElementTrace = {
  elementId: number
  nodeIds: number[]
  area: number
  jacobian: [[number, number], [number, number]]
  determinant: number
  physicalGradients: Vector2[]
  localStiffness: number[][]
  localLoad: number[]
  quadratureSamples: AssemblySampleTrace[]
}

export function AssemblyStageView({
  selectedTrace,
  densePreview,
  mesh,
  selectedElementDofs,
  elementKind,
  onSelectElement,
}: {
  selectedTrace: AssemblyElementTrace | undefined
  densePreview: number[][]
  mesh: Mesh
  selectedElementDofs: number[] | undefined
  elementKind: ElementKind
  onSelectElement: (elementId: number) => void
}) {
  const fallbackDofCount = (() => {
    switch (elementKind) {
      case 'quad':
        return 4
      case 'triangle':
        return 3
      case 'quad-q2':
        return 9
      case 'triangle-p2':
        return 6
    }
  })()
  const dofCount = selectedElementDofs?.length ?? fallbackDofCount
  const elementNoun = elementLabel(elementKind, false).toLowerCase()
  return (
    <section className="panel-card stage-view">
      <h2>Element evaluation and global assembly</h2>
      <p>
        Each {elementNoun} produces a <em>local</em> {dofCount} × {dofCount} stiffness matrix and a {dofCount}-entry
        load vector. Assembly inserts those local numbers into the <em>global</em> system using
        the selected element&apos;s global degree-of-freedom ids.
      </p>
      <div className="note-grid">
        <article>
          <h3>Selected element trace</h3>
          {selectedTrace ? (
            <ul className="compact-list">
              <li>Element #{selectedTrace.elementId}</li>
              <li>Node ids: {selectedTrace.nodeIds.join(', ')}</li>
              <li>Area: {formatNumber(selectedTrace.area)}</li>
              <li>det(J): {formatNumber(selectedTrace.determinant)}</li>
              <li>J = {formatMatrix2(selectedTrace.jacobian)}</li>
              <li>
                Physical gradients:{' '}
                {selectedTrace.physicalGradients.map((gradient) => formatPoint(gradient)).join(' | ')}
              </li>
            </ul>
          ) : (
            <p>No trace available for the selected element.</p>
          )}
        </article>
        <article>
          <h3>Local contributions</h3>
          {selectedTrace ? (
            elementKind === 'triangle' ? (
              <>
                <p className="small-note">
                  For linear triangles, each basis gradient is constant on the element. That
                  makes every local stiffness entry
                  {' '}
                  <code>K_T[i,j] = |T| ∇φ_i · ∇φ_j</code>
                  {' '}
                  for this Poisson problem.
                </p>
                <p className="small-note">
                  The physical gradients come from the reference element through
                  {' '}
                  <code>∇φ_i = J^(-T) ∇φ̂_i</code>.
                  {' '}
                  The Jacobian of the selected element is shown in the trace, so the matrix
                  entries can be read as “map the reference gradients with <code>J^(-T)</code>,
                  then take dot products, then multiply by the element area”.
                </p>
                <FormulaMatrix trace={selectedTrace} />
                <MatrixTable matrix={selectedTrace.localStiffness} />
              </>
            ) : (
              <>
                <p className="small-note">
                  {isHigherOrder(elementKind)
                    ? `For ${elementOrderLabel(elementKind)} elements, the reference gradients ∇φ̂ᵢ(ξ,η) vary across the element, so each stiffness entry is a quadrature sum.`
                    : 'For bilinear quadrilaterals, the reference gradients ∇N̂ᵢ(ξ,η) vary with position, so each stiffness entry is a quadrature sum, not a closed form.'}
                </p>
                <p className="small-note">
                  <code>
                    K[i,j] = Σ_q w_q · |det J(ξ_q)| · (J(ξ_q)^(-T) ∇φ̂ᵢ(ξ_q)) · (J(ξ_q)^(-T) ∇φ̂ⱼ(ξ_q))
                  </code>
                </p>
                <QuadFormulaMatrix trace={selectedTrace} />
                <MatrixTable matrix={selectedTrace.localStiffness} />
              </>
            )
          ) : null}
        </article>
      </div>
      {selectedElementDofs ? (
        <div className="note-grid">
          <article>
            <h3>Local-to-global mapping</h3>
            <MappingDiagram dofs={selectedElementDofs} />
            <p className="small-note">
              Local row/column `i,j ∈ {'{0..' + (selectedElementDofs.length - 1) + '}'}` is added
              to global position `A[dof_i, dof_j]`. For this element the map is:
              {' '}
              {selectedElementDofs.map((dof, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? ', ' : ''}
                  `{index} → {dof}`
                </React.Fragment>
              ))}.
            </p>
          </article>
          <article>
            <h3>What lands in the matrix</h3>
            <p className="math-block">
              A({isQuadKind(elementKind) ? 'Q' : 'T'})[i,j] = ∫<sub>{isQuadKind(elementKind) ? 'Q' : 'T'}</sub> ∇φ<sub>i</sub> · ∇φ<sub>j</sub> dx
            </p>
            <p className="small-note">
              During assembly, the selected {elementNoun} does not create a separate matrix block.
              Instead, its local {dofCount} × {dofCount} entries are accumulated into the existing
              global rows and columns indexed by its global DOFs. Neighboring elements touching
              the same DOF add into the same global entries.
            </p>
          </article>
        </div>
      ) : null}
      <LoadVectorSection
        selectedTrace={selectedTrace}
        selectedElementDofs={selectedElementDofs}
        elementKind={elementKind}
      />
      <div className="note-grid">
        <article>
          <h3>Constrained matrix preview</h3>
          <MatrixTable
            matrix={densePreview.slice(0, 10).map((row) => row.slice(0, 10))}
            highlightedRows={selectedElementDofs ? [...selectedElementDofs] : []}
            highlightedColumns={selectedElementDofs ? [...selectedElementDofs] : []}
          />
          <p className="small-note">
            Highlighted rows and columns correspond to the selected element&apos;s global DOFs.
            Their intersections are exactly where that element&apos;s local stiffness entries are
            added into the global matrix.
          </p>
        </article>
        <article>
          <h3>Sparsity structure</h3>
          <SparsityPlot matrix={densePreview} highlightedDofs={selectedElementDofs ? [...selectedElementDofs] : []} />
          <p className="small-note">
            The highlighted dots mark the selected element&apos;s `{dofCount} x {dofCount}` contribution
            pattern inside the global sparsity structure. The wider band comes from overlap with
            neighboring elements on the mesh.
          </p>
        </article>
      </div>
      <p className="small-note">
        Boundary conditions are applied after assembly so the app can show the unconstrained
        finite element system and then the constrained linear system separately.
      </p>
      <p className="small-note">Click an element to inspect its assembly trace.</p>
      <InteractiveMeshView
        mesh={mesh}
        selectedElementId={selectedTrace?.elementId ?? 0}
        onSelectElement={onSelectElement}
        compact
      />
    </section>
  )
}

function LoadVectorSection({
  selectedTrace,
  selectedElementDofs,
  elementKind,
}: {
  selectedTrace: AssemblyElementTrace | undefined
  selectedElementDofs: number[] | undefined
  elementKind: ElementKind
}) {
  if (!selectedTrace) return null

  const { quadratureSamples, localLoad } = selectedTrace
  const n = localLoad.length
  const basisSymbol = isQuadKind(elementKind) ? 'N' : 'φ'
  const domainSymbol = isQuadKind(elementKind) ? 'Q' : 'T'
  const refSymbol = isQuadKind(elementKind) ? 'Q̂' : 'T̂'
  const refAreaText = isQuadKind(elementKind)
    ? '1 (the area of [0,1]²)'
    : '½ (the area of the reference triangle)'
  const jacobianIsConstant = !isQuadKind(elementKind)

  const sampleBasisContribution = (q: number, i: number): number => {
    const sample = quadratureSamples[q]
    return sample.weight * Math.abs(sample.determinant) * sample.sourceValue * sample.shapeValues[i]
  }
  const perDofSum = Array.from({ length: n }, (_, i) =>
    quadratureSamples.reduce((sum, _s, qIndex) => sum + sampleBasisContribution(qIndex, i), 0),
  )

  return (
    <div className="note-grid">
      <article>
        <h3>Local load vector</h3>
        <p className="small-note">
          Each entry b_{domainSymbol}[i] is the projection of the source term f onto the local
          basis function {basisSymbol}̂ᵢ, integrated over the element. The integral is pulled
          back to the reference domain via the Jacobian:
        </p>
        <p className="math-block">
          b_{domainSymbol}[i] = ∫_{domainSymbol} f · {basisSymbol}ᵢ dx = ∫_{refSymbol} f(F(ξ,η)) · {basisSymbol}̂ᵢ(ξ,η) · |det J(ξ,η)| dξdη
        </p>
        <p className="math-block">
          ≈ Σ_q w_q · f(x_q) · {basisSymbol}̂ᵢ(ξ_q) · |det J(ξ_q)|
        </p>
        <p className="small-note">
          Here q indexes the quadrature points on the reference domain, ξ_q is the reference
          coordinate of the q-th point, w_q is its weight, and x_q = F(ξ_q) is the physical
          coordinate. The weights satisfy Σ_q w_q = {refAreaText}.
        </p>
        {jacobianIsConstant ? (
          <p className="small-note">
            For triangles |det J| is constant on the element, so it can be pulled out of the sum.
            For this problem f = 1 everywhere, so f(x_q) = 1 at every quadrature point.
          </p>
        ) : (
          <p className="small-note">
            For quadrilaterals |det J(ξ_q)| generally varies across the element — on the
            structured square mesh it happens to be constant, but the code evaluates it
            per-sample regardless. f(x_q) = 1 at every quadrature point for this problem.
          </p>
        )}
        <div className="load-table">
          <div className="load-table-row load-table-header">
            <span>q</span>
            {Array.from({ length: n }, (_, i) => (
              <span key={i}>w_q · |det J| · f · {basisSymbol}̂{subscript(i + 1)}</span>
            ))}
          </div>
          {quadratureSamples.map((_sample, qIndex) => (
            <div key={qIndex} className="load-table-row">
              <span>{qIndex + 1}</span>
              {Array.from({ length: n }, (_, i) => (
                <span key={i}>{formatNumber(sampleBasisContribution(qIndex, i))}</span>
              ))}
            </div>
          ))}
          <div className="load-table-row load-table-result-row">
            <span>Σ_q</span>
            {perDofSum.map((val, i) => (
              <span key={i} className="load-entry-highlight">{formatNumber(val)}</span>
            ))}
          </div>
        </div>
        <p className="small-note">
          The bottom row is b_{domainSymbol}[i]. For a uniform source f = 1 and a symmetric
          element, all {n} entries are equal: each basis function captures exactly the same
          share of ∫_{domainSymbol} 1 dx = |{domainSymbol}|.
        </p>
      </article>
      <article>
        <h3>RHS accumulation</h3>
        <p className="math-block">F[dof_i] += b_{domainSymbol}[i]</p>
        <p className="small-note">
          The same local-to-global map that scatters K_{domainSymbol} into A also scatters
          b_{domainSymbol} into the global right-hand side vector F. Every element sharing
          DOF k contributes its local load entry into the same slot, so F[k] accumulates to
          ∫_Ω f · {basisSymbol}ₖ dx across all elements.
        </p>
        {selectedElementDofs ? (
          <div className="mapping-diagram">
            {selectedElementDofs.map((globalDof, localIndex) => (
              <React.Fragment key={localIndex}>
                <div className="mapping-box local">
                  <span>b_{domainSymbol}[{localIndex}]</span>
                  <strong>{formatNumber(localLoad[localIndex])}</strong>
                </div>
                <div className="mapping-arrow" aria-hidden="true">→</div>
                <div className="mapping-box global">
                  <span>F[{globalDof}] +=</span>
                  <strong>{formatNumber(localLoad[localIndex])}</strong>
                </div>
              </React.Fragment>
            ))}
          </div>
        ) : null}
        <p className="small-note">
          After all elements are processed, F[k] holds the full integral ∫_Ω f · {basisSymbol}ₖ dx,
          assembled from per-element contributions exactly as the global stiffness matrix was.
        </p>
      </article>
    </div>
  )
}

function MatrixTable({
  matrix,
  highlightedRows = [],
  highlightedColumns = [],
}: {
  matrix: number[][]
  highlightedRows?: number[]
  highlightedColumns?: number[]
}) {
  const highlightedRowSet = new Set(highlightedRows)
  const highlightedColumnSet = new Set(highlightedColumns)

  return (
    <div className="matrix">
      {matrix.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={highlightedRowSet.has(rowIndex) ? 'matrix-row matrix-row-highlight' : 'matrix-row'}
        >
          {row.map((value, columnIndex) => {
            const isHighlighted =
              highlightedRowSet.has(rowIndex) && highlightedColumnSet.has(columnIndex)
            return (
              <span
                key={columnIndex}
                className={isHighlighted ? 'matrix-cell matrix-cell-hit' : 'matrix-cell'}
              >
                {formatNumber(value)}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MappingDiagram({ dofs }: { dofs: number[] }) {
  return (
    <div className="mapping-diagram">
      {dofs.map((globalDof, localIndex) => (
        <React.Fragment key={localIndex}>
          <div className="mapping-box local">
            <span>local</span>
            <strong>{localIndex}</strong>
          </div>
          <div className="mapping-arrow" aria-hidden="true">→</div>
          <div className="mapping-box global">
            <span>global DOF</span>
            <strong>{globalDof}</strong>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

function FormulaMatrix({ trace }: { trace: AssemblyElementTrace }) {
  const referenceGradients: [Vector2, Vector2, Vector2] = [
    { x: -1, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]

  return (
    <div className="formula-matrix">
      <div className="formula-explainer">
        <span className="formula-symbol">Reference-to-physical map</span>
        <span className="formula-text">
          For vertices x₁, x₂, x₃ of the physical triangle,
          {' '}
          <code>F(ξ,η) = x₁ + J [ξ,η]^T</code>
          {' '}
          with
          {' '}
          <code>J = [x₂ - x₁, x₃ - x₁]</code>.
        </span>
        <span className="formula-text">
          In coordinates,
          {' '}
          <code>
            J = [[x₂-x₁, x₃-x₁],[y₂-y₁, y₃-y₁]]
          </code>.
        </span>
        <span className="formula-text">
          J = {formatMatrix2(trace.jacobian)}, det(J) = {formatNumber(trace.determinant)},
          {' '}
          |T| = {formatNumber(trace.area)}
        </span>
        <span className="formula-text">
          ∇φ̂₁ = ({formatVector(referenceGradients[0])}), ∇φ̂₂ = ({formatVector(referenceGradients[1])}),
          {' '}
          ∇φ̂₃ = ({formatVector(referenceGradients[2])})
        </span>
        <span className="formula-text">
          J^(-T) ∇φ̂₁ = ({formatVector(trace.physicalGradients[0])}), J^(-T) ∇φ̂₂ = ({formatVector(trace.physicalGradients[1])}),
          {' '}
          J^(-T) ∇φ̂₃ = ({formatVector(trace.physicalGradients[2])})
        </span>
      </div>
      {trace.localStiffness.map((row, rowIndex) => (
        <div key={rowIndex} className="formula-row">
          {row.map((value, columnIndex) => (
            <div key={columnIndex} className="formula-cell">
              <span className="formula-symbol">
                K[{rowIndex + 1},{columnIndex + 1}]
              </span>
              <span className="formula-text">
                {formatNumber(trace.area)} · (J^(-T)∇φ̂{rowIndex + 1}) · (J^(-T)∇φ̂{columnIndex + 1})
              </span>
              <span className="formula-text">
                = {formatNumber(trace.area)} · ({formatVector(trace.physicalGradients[rowIndex])})
                · ({formatVector(trace.physicalGradients[columnIndex])})
              </span>
              <strong>{formatNumber(value)}</strong>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function QuadFormulaMatrix({ trace }: { trace: AssemblyElementTrace }) {
  const { quadratureSamples, localStiffness } = trace
  const n = localStiffness.length

  return (
    <div className="formula-matrix">
      <div className="formula-explainer">
        <span className="formula-symbol">Isoparametric map on Q̂ = [0,1]²</span>
        <span className="formula-text">
          <code>F(ξ,η) = Σᵢ Nᵢ(ξ,η) xᵢ</code>, <code>J(ξ,η) = Σᵢ xᵢ ⊗ ∇N̂ᵢ(ξ,η)</code>.
          Both J and det(J) vary across the element in general.
        </span>
        <span className="formula-text">
          Representative (at ref centroid): J = {formatMatrix2(trace.jacobian)},
          det(J) = {formatNumber(trace.determinant)}, |Q| = {formatNumber(trace.area)}
        </span>
      </div>
      <div className="quadrature-table">
        <div className="row header">
          <span>q</span>
          <span>ξ_q</span>
          <span>det J(ξ_q)</span>
          <span>J^(-T)∇N̂ᵢ(ξ_q) (all i)</span>
        </div>
        {quadratureSamples.map((sample, qIndex) => (
          <div key={qIndex} className="row">
            <span>{qIndex + 1}</span>
            <span>({formatNumber(sample.referencePoint.x)}, {formatNumber(sample.referencePoint.y)})</span>
            <span>{formatNumber(sample.determinant)}</span>
            <span>
              {sample.physicalGradients
                .map((g, i) => `N${subscript(i + 1)}:(${formatVector(g)})`)
                .join(' | ')}
            </span>
          </div>
        ))}
      </div>
      {localStiffness.map((row, rowIndex) => (
        <div key={rowIndex} className="formula-row">
          {row.map((value, columnIndex) => {
            const perSample = quadratureSamples.map(
              (s) =>
                s.weight *
                Math.abs(s.determinant) *
                (s.physicalGradients[rowIndex].x * s.physicalGradients[columnIndex].x +
                  s.physicalGradients[rowIndex].y * s.physicalGradients[columnIndex].y),
            )
            return (
              <div key={columnIndex} className="formula-cell">
                <span className="formula-symbol">
                  K[{rowIndex + 1},{columnIndex + 1}]
                </span>
                <span className="formula-text">
                  Σ_q w_q · |det J(ξ_q)| · (J^(-T)∇N̂{subscript(rowIndex + 1)}) · (J^(-T)∇N̂{subscript(columnIndex + 1)})
                </span>
                <span className="formula-text">
                  = {perSample.map((v) => formatNumber(v)).join(' + ')}
                </span>
                <strong>{formatNumber(value)}</strong>
              </div>
            )
          })}
        </div>
      ))}
      {n === 0 ? <p className="small-note">(empty)</p> : null}
    </div>
  )
}

function SparsityPlot({
  matrix,
  highlightedDofs = [],
}: {
  matrix: number[][]
  highlightedDofs?: number[]
}) {
  const size = Math.min(matrix.length, 40)
  const plot = matrix.slice(0, size).map((row) => row.slice(0, size))
  const highlighted = new Set(highlightedDofs.filter((dof) => dof < size))

  return (
    <svg className="sparsity-svg" viewBox="0 0 240 240">
      <rect x="0" y="0" width="240" height="240" rx="18" />
      {plot.flatMap((row, rowIndex) =>
        row.map((value, columnIndex) =>
          Math.abs(value) > 1e-12 ? (
            <circle
              key={`${rowIndex}-${columnIndex}`}
              cx={12 + (216 * columnIndex) / Math.max(size - 1, 1)}
              cy={12 + (216 * rowIndex) / Math.max(size - 1, 1)}
              r={highlighted.has(rowIndex) && highlighted.has(columnIndex) ? '4' : '2.2'}
              className={
                highlighted.has(rowIndex) && highlighted.has(columnIndex)
                  ? 'sparsity-hit'
                  : undefined
              }
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
