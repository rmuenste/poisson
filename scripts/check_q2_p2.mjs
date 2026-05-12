import {
  BiquadraticQuadrilateralElement,
  QuadraticTriangularElement,
} from '../src/core/fem/elements.ts'
import {
  createStructuredP2TriangularMesh,
  createStructuredQ2QuadMesh,
} from '../src/core/fem/mesh.ts'
import {
  QuadGauss3x3Quadrature,
  TriangleGauss3Quadrature,
} from '../src/core/quadrature/quadrature.ts'

const refQ2 = [
  [0, 0], [1, 0], [1, 1], [0, 1],
  [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5],
  [0.5, 0.5],
]
const refP2 = [
  [0, 0], [1, 0], [0, 1],
  [0.5, 0.5], [0, 0.5], [0.5, 0],
]

function assertClose(actual, expected, label, tol = 1e-10) {
  if (Math.abs(actual - expected) > tol) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`)
    process.exitCode = 1
  } else {
    console.log(`ok   ${label}`)
  }
}

const q2 = new BiquadraticQuadrilateralElement()
for (let i = 0; i < 9; i += 1) {
  const [x, y] = refQ2[i]
  const N = q2.shapeFunctions({ x, y })
  for (let j = 0; j < 9; j += 1) {
    assertClose(N[j], i === j ? 1 : 0, `Q2 N${j}(node ${i})`)
  }
}

const p2 = new QuadraticTriangularElement()
for (let i = 0; i < 6; i += 1) {
  const [x, y] = refP2[i]
  const N = p2.shapeFunctions({ x, y })
  for (let j = 0; j < 6; j += 1) {
    assertClose(N[j], i === j ? 1 : 0, `P2 N${j}(node ${i})`)
  }
}

const gridQ2 = [0, 0.25, 0.5, 0.75, 1]
for (const x of gridQ2) {
  for (const y of gridQ2) {
    const sum = q2.shapeFunctions({ x, y }).reduce((a, b) => a + b, 0)
    assertClose(sum, 1, `Q2 PoU @(${x},${y})`)
  }
}
for (const x of [0, 0.25, 0.5]) {
  for (const y of [0, 0.25, 0.5]) {
    if (x + y > 1) continue
    const sum = p2.shapeFunctions({ x, y }).reduce((a, b) => a + b, 0)
    assertClose(sum, 1, `P2 PoU @(${x},${y})`)
  }
}

const wq = new QuadGauss3x3Quadrature().points().reduce((s, p) => s + p.weight, 0)
assertClose(wq, 1, 'Q2 gauss 3x3 weight sum')
const wt = new TriangleGauss3Quadrature().points().reduce((s, p) => s + p.weight, 0)
assertClose(wt, 0.5, 'P2 triangle weight sum')

const mq = createStructuredQ2QuadMesh(4)
assertClose(mq.nodes.length, 81, 'Q2 mesh node count (div=4)')
assertClose(mq.elements.length, 16, 'Q2 mesh element count (div=4)')

const mp = createStructuredP2TriangularMesh(4)
assertClose(mp.nodes.length, 81, 'P2 mesh node count (div=4)')
assertClose(mp.elements.length, 32, 'P2 mesh element count (div=4)')

console.log(process.exitCode ? 'FAILURES' : 'All checks passed')
