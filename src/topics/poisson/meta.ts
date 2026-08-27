import type { Topic } from '../types.ts'

/**
 * Shared by the registry (menu entry) and by the topic itself (page headline),
 * so the two can never drift apart.
 */
export const poissonTopicMeta: Omit<Topic, 'View'> = {
  id: 'poisson',
  title: 'Poisson Solver',
  tagline: 'FEM from mesh to solution',
  eyebrow: 'Finite Elements as an explorable system',
  lede:
    'A configurable 2D finite element prototype for -Δu = 1 on the unit square, designed to expose meshes, basis functions, quadrature, assembly, and the linear solve as distinct replaceable stages.',
  status: 'available',
  outline: [
    'Strong and weak form of the Poisson problem',
    'Structured meshes with uniform regular refinement',
    'P1/P2 triangle and Q1/Q2 quadrilateral finite element spaces',
    'Quadrature rules and their exactness',
    'Element-wise assembly into a sparse global system',
    'Dirichlet constraints and the direct linear solve',
  ],
}
