import type { Topic } from '../types.ts'

export const projectionTopicMeta: Omit<Topic, 'View'> = {
  id: 'projection',
  title: 'Discrete Projection',
  tagline: "Turek's PP scheme",
  eyebrow: 'Splitting velocity from pressure',
  lede:
    'How the discrete projection method — the PP scheme of Turek’s FEATFLOW solvers — turns one coupled Navier–Stokes saddle-point system per time step into two velocity solves and a single Pressure-Poisson solve, and why that Poisson problem is exactly the one the first topic assembles.',
  status: 'available',
  outline: [
    'The incompressible Navier–Stokes equations and the pressure constraint',
    'One-Step-θ in time, finite elements in space',
    'The pressure Schur complement',
    'The basic iteration and its preconditioners',
    'The five substeps of the PP algorithm',
    'Why the pressure step is a Poisson problem',
  ],
}
