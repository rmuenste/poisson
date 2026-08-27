import type { Topic } from './types.ts'
import { PoissonTopic } from './poisson/PoissonTopic.tsx'
import { poissonTopicMeta } from './poisson/meta.ts'
import { ProjectionTopic } from './projection/ProjectionTopic.tsx'
import { projectionTopicMeta } from './projection/meta.ts'

/**
 * The single place that knows which topics exist. Adding a topic means adding an
 * entry here — the shell and the menu adapt on their own.
 */
export const topics: Topic[] = [
  { ...poissonTopicMeta, View: PoissonTopic },
  { ...projectionTopicMeta, View: ProjectionTopic },
  {
    id: 'convection-diffusion',
    title: 'Convection–Diffusion',
    tagline: 'Transport and stabilization',
    eyebrow: 'When diffusion stops being the whole story',
    lede:
      'What changes once a transport term joins the Laplacian: a nonsymmetric system matrix, the Péclet number as the governing ratio, spurious oscillations on under-resolved meshes, and the upwind and streamline-diffusion stabilizations that suppress them.',
    status: 'planned',
    outline: [
      'The convection–diffusion weak form and its nonsymmetric matrix',
      'Mesh Péclet number and the onset of oscillations',
      'Upwind and streamline-diffusion stabilization',
      'Boundary layers and what the mesh has to resolve',
    ],
  },
  {
    id: 'time-stepping',
    title: 'Time Stepping',
    tagline: 'From steady to unsteady',
    eyebrow: 'Marching a discrete solution through time',
    lede:
      'The step from a steady problem to the heat equation: mass matrices alongside stiffness matrices, the one-step θ family from explicit Euler to Crank–Nicolson, stability limits, and how the time step interacts with the mesh width.',
    status: 'planned',
    outline: [
      'The mass matrix and lumping',
      'One-step θ schemes: explicit Euler, implicit Euler, Crank–Nicolson',
      'Stability limits and the time-step/mesh-width coupling',
      'Accuracy in time versus accuracy in space',
    ],
  },
  {
    id: 'iterative-solvers',
    title: 'Iterative Solvers',
    tagline: 'Beyond dense LU',
    eyebrow: 'What to do when the direct solve stops scaling',
    lede:
      'The dense LU used by the Poisson topic is O(n³) by design. This topic replaces it with iterative alternatives and makes their convergence visible: classical relaxation, conjugate gradients, preconditioning, and the multigrid idea of attacking each error frequency on the grid that resolves it.',
    status: 'planned',
    outline: [
      'Jacobi, Gauss–Seidel and SOR as smoothers',
      'Conjugate gradients and the role of the condition number',
      'Preconditioning and why it changes convergence',
      'Grid transfer and a two-grid multigrid cycle',
    ],
  },
]

export const defaultTopicId = topics[0].id
