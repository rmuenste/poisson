import type { ElementKind, Mesh } from '../../core/fem/mesh.ts'
import { PlotlySurfacePlot } from '../PlotlySurfacePlot.tsx'
import { ReferenceSquareSvg, ReferenceTriangleSvg, RefToPhysMappingSvg } from '../referenceShapes.tsx'
import { NODE_COLORS, isHigherOrder, isQuadKind, subscript } from '../shared.ts'

export function SpaceStageView({
  dofCount,
  constrainedDofs,
  freeDofs,
  selectedElementId,
  mesh,
  elementKind,
}: {
  dofCount: number
  constrainedDofs: number[]
  freeDofs: number[]
  selectedElementId: number
  mesh: Mesh
  elementKind: ElementKind
}) {
  const element = mesh.elements[selectedElementId]
  const basisHeading = (() => {
    switch (elementKind) {
      case 'quad':
        return 'Q1 basis on the reference square [0,1]²'
      case 'quad-q2':
        return 'Q2 basis on the reference square [0,1]²'
      case 'triangle-p2':
        return 'P2 basis on the reference triangle'
      case 'triangle':
        return 'P1 basis on the reference triangle'
    }
  })()
  const basisFormulas = (() => {
    switch (elementKind) {
      case 'quad':
        return {
          shapes: ['N₁ = (1-ξ)(1-η)', 'N₂ = ξ(1-η)', 'N₃ = ξη', 'N₄ = (1-ξ)η'],
          gradients: [
            '∇N₁ = (-(1-η), -(1-ξ))',
            '∇N₂ = (1-η, -ξ)',
            '∇N₃ = (η, ξ)',
            '∇N₄ = (-η, 1-ξ)',
          ],
        }
      case 'quad-q2':
        return {
          shapes: [
            'Lₐ(t) = (1-t)(1-2t),  L_b(t) = 4t(1-t),  L_c(t) = t(2t-1)',
            'Nᵢ(ξ,η) = L_{aᵢ}(ξ) · L_{bᵢ}(η)',
            'where (aᵢ, bᵢ) ∈ {a,b,c}² selects one of the 9 nodes',
          ],
          gradients: [
            "∂Nᵢ/∂ξ = L'_{aᵢ}(ξ) · L_{bᵢ}(η)",
            "∂Nᵢ/∂η = L_{aᵢ}(ξ) · L'_{bᵢ}(η)",
          ],
        }
      case 'triangle-p2':
        return {
          shapes: [
            'λ₁ = 1 - ξ - η,  λ₂ = ξ,  λ₃ = η',
            'φᵢ = λᵢ (2λᵢ - 1)        (vertex i = 1..3)',
            'φᵢ = 4 λⱼ λₖ              (edge midpoint opposite vertex i)',
          ],
          gradients: [
            '∇(λ_i (2λ_i - 1)) = (4λ_i - 1) ∇λ_i',
            '∇(4 λ_j λ_k) = 4 (λ_k ∇λ_j + λ_j ∇λ_k)',
          ],
        }
      case 'triangle':
        return {
          shapes: ['φ₁ = 1 - ξ - η', 'φ₂ = ξ', 'φ₃ = η'],
          gradients: ['∇φ₁ = (-1, -1)', '∇φ₂ = (1, 0)', '∇φ₃ = (0, 1)'],
        }
    }
  })()
  const domainLabel = isQuadKind(elementKind)
    ? 'Reference square [0,1]²'
    : 'Reference triangle'
  const dofCountText = element.nodeIds.length

  return (
    <section className="panel-card stage-view">
      <h2>Finite element space</h2>
      <div className="note-grid">
        <article>
          <h3>{basisHeading}</h3>
          {basisFormulas.shapes.map((line: string) => (
            <p key={line} className="math-block">{line}</p>
          ))}
          <p className="small-note">Gradients:</p>
          {basisFormulas.gradients.map((line: string) => (
            <p key={line} className="math-block">{line}</p>
          ))}
        </article>
        <article>
          <h3>Global space summary</h3>
          <ul className="compact-list">
            <li>Total DOFs: {dofCount}</li>
            <li>Free DOFs: {freeDofs.length}</li>
            <li>Boundary DOFs: {constrainedDofs.length}</li>
            <li>Selected element DOFs: {element.nodeIds.join(', ')}</li>
          </ul>
        </article>
      </div>
      <div className="note-grid">
        <article>
          <h3>{domainLabel}</h3>
          {isQuadKind(elementKind) ? <ReferenceSquareSvg /> : <ReferenceTriangleSvg />}
        </article>
        <article>
          <h3>Selected element DOF map</h3>
          <ul className="compact-list">
            <li>Element #{selectedElementId}</li>
            <li>Node ids: {element.nodeIds.join(', ')}</li>
          </ul>
          <p className="small-note">
            Each vertex of the selected element corresponds to one global degree of freedom.
            These {dofCountText} node ids are the local-to-global map used during assembly.
          </p>
        </article>
      </div>
      <article>
        <h3>Element map F: {isQuadKind(elementKind) ? 'Q̂' : 'T̂'} → K</h3>
        <p className="small-note">
          F maps each reference coordinate (ξ,η) ∈{' '}
          {isQuadKind(elementKind) ? 'Q̂ = [0,1]²' : 'T̂'}
          {' '}to a physical coordinate (x,y) inside element K.
          Color-matched vertices show the correspondence between reference corners and physical nodes.
          {isHigherOrder(elementKind)
            ? ' For a structured mesh the map is still linear (or bilinear) in geometry, but the basis functions are quadratic so the solution interpolant is curved within each element.'
            : isQuadKind(elementKind)
              ? ' The bilinear map F(ξ,η) = Σᵢ Nᵢ(ξ,η)·xᵢ interpolates the four node positions.'
              : ' The affine map F(ξ,η) = x₁ + J·(ξ,η)ᵀ is fully determined by the three vertex positions.'}
        </p>
        <RefToPhysMappingSvg
          elementKind={elementKind}
          mesh={mesh}
          selectedElementId={selectedElementId}
        />
        <p className="small-note" style={{ marginTop: '10px' }}>
          {isQuadKind(elementKind)
            ? 'The Jacobian J = ∂F/∂(ξ,η) varies with position:'
            : 'The Jacobian J = ∂F/∂(ξ,η) is constant over the element:'}
        </p>
        <p className="math-block" style={{ whiteSpace: 'pre' }}>
          {isQuadKind(elementKind)
            ? 'J(ξ,η) = [ Σᵢ xᵢ ∂Nᵢ/∂ξ   Σᵢ xᵢ ∂Nᵢ/∂η ]\n         [ Σᵢ yᵢ ∂Nᵢ/∂ξ   Σᵢ yᵢ ∂Nᵢ/∂η ]'
            : 'J = [ x₂-x₁  x₃-x₁ ]\n    [ y₂-y₁  y₃-y₁ ]'}
        </p>
      </article>
      <article>
        <h3>Basis functions on the reference element</h3>
        <BasisFunctionGallery elementKind={elementKind} />
      </article>
      <p className="small-note">
        Dirichlet nodes stay in the global numbering but are constrained explicitly in the
        constraint stage so users can inspect both the unconstrained and constrained systems.
      </p>
    </section>
  )
}

type BasisDefinition = {
  name: string
  formula: string
  color: string
  evaluate: (x: number, y: number) => number
}

function basisDefinitionsFor(kind: ElementKind): BasisDefinition[] {
  const colors = NODE_COLORS[kind]
  switch (kind) {
    case 'quad':
      return [
        { name: 'N₁', formula: '(1-ξ)(1-η)', color: colors[0], evaluate: (x, y) => (1 - x) * (1 - y) },
        { name: 'N₂', formula: 'ξ(1-η)', color: colors[1], evaluate: (x, y) => x * (1 - y) },
        { name: 'N₃', formula: 'ξη', color: colors[2], evaluate: (x, y) => x * y },
        { name: 'N₄', formula: '(1-ξ)η', color: colors[3], evaluate: (x, y) => (1 - x) * y },
      ]
    case 'triangle':
      return [
        { name: 'φ₁', formula: '1 - ξ - η', color: colors[0], evaluate: (x, y) => 1 - x - y },
        { name: 'φ₂', formula: 'ξ', color: colors[1], evaluate: (x, _y) => x },
        { name: 'φ₃', formula: 'η', color: colors[2], evaluate: (_x, y) => y },
      ]
    case 'quad-q2': {
      const La = (t: number) => (1 - t) * (1 - 2 * t)
      const Lb = (t: number) => 4 * t * (1 - t)
      const Lc = (t: number) => t * (2 * t - 1)
      const fs: Array<[(t: number) => number, string]> = [
        [La, 'Lₐ'],
        [Lb, 'L_b'],
        [Lc, 'L_c'],
      ]
      // Order matches BiquadraticQuadrilateralElement.shapeFunctions
      const order: Array<[number, number]> = [
        [0, 0], [2, 0], [2, 2], [0, 2],
        [1, 0], [2, 1], [1, 2], [0, 1],
        [1, 1],
      ]
      return order.map(([a, b], idx) => ({
        name: `N${subscript(idx + 1)}`,
        formula: `${fs[a][1]}(ξ)·${fs[b][1]}(η)`,
        color: colors[idx],
        evaluate: (x: number, y: number) => fs[a][0](x) * fs[b][0](y),
      }))
    }
    case 'triangle-p2': {
      const vertex = (l: number) => l * (2 * l - 1)
      return [
        { name: 'φ₁', formula: 'λ₁(2λ₁-1)', color: colors[0], evaluate: (x, y) => vertex(1 - x - y) },
        { name: 'φ₂', formula: 'λ₂(2λ₂-1)', color: colors[1], evaluate: (x, _y) => vertex(x) },
        { name: 'φ₃', formula: 'λ₃(2λ₃-1)', color: colors[2], evaluate: (_x, y) => vertex(y) },
        { name: 'φ₄', formula: '4 λ₂ λ₃', color: colors[3], evaluate: (x, y) => 4 * x * y },
        { name: 'φ₅', formula: '4 λ₁ λ₃', color: colors[4], evaluate: (x, y) => 4 * (1 - x - y) * y },
        { name: 'φ₆', formula: '4 λ₁ λ₂', color: colors[5], evaluate: (x, y) => 4 * (1 - x - y) * x },
      ]
    }
  }
}

function BasisFunctionGallery({ elementKind }: { elementKind: ElementKind }) {
  const domain = isQuadKind(elementKind) ? 'square' : 'triangle'
  const basisDefinitions = basisDefinitionsFor(elementKind)

  return (
    <div className="basis-gallery">
      {basisDefinitions.map((basis) => (
        <div key={basis.name} className="basis-card">
          <div className="basis-heading">
            <strong>{basis.name}</strong>
            <span>{basis.formula}</span>
          </div>
          <PlotlySurfacePlot
            color={basis.color}
            evaluate={basis.evaluate}
            label={basis.name}
            domain={domain}
          />
        </div>
      ))}
    </div>
  )
}
