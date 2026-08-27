# CLAUDE.md

## Project Overview

Browser-based 2D FEM solver for the Poisson problem `-Δu = 1` on `(0,1)²` with homogeneous Dirichlet BCs. Built as both a solver and an educational tool. Stack: React 19 + Vite + TypeScript; Plotly for 3D surface visualization; zero external math dependencies.

## Architecture (Three Layers)

```
Numerical Core → Trace Objects → UI
```

1. **Numerical core** (`src/core/`) — pure math, no UI references
2. **Trace/inspection layer** (`src/core/tracing/`) — structured data emitted by core
3. **Application/UI layer** (`src/App.tsx`, `src/topics/`, `src/ui/`) — reads core + traces, renders

## Source Layout

| Path | Responsibility |
|------|---------------|
| `src/core/pipeline/contracts.ts` | All stage interfaces + `SimulationConfig`, `SimulationSnapshot` |
| `src/core/domain/problem.ts` | `IProblemDefinition`, `DirichletBoundaryCondition`, unit-square Poisson |
| `src/core/fem/mesh.ts` | `Mesh`, node/element topology, structured mesh generation |
| `src/core/fem/elements.ts` | `IFiniteElement`, linear triangular shape functions, Jacobian |
| `src/core/fem/weakForm.ts` | `DiffusionTerm`, `UnitLoadTerm`, `WeakForm` |
| `src/core/quadrature/quadrature.ts` | `IQuadratureRule`, trapezoidal & centroid rules |
| `src/core/algebra/linearAlgebra.ts` | `SparseMatrix`, `DenseDirectSolver` (LU), `HomogeneousDirichletConstraintHandler` |
| `src/core/stages/defaultStages.ts` | Concrete pipeline stage implementations (element assembly loop) |
| `src/core/pipeline/defaultPipeline.ts` | `SimulationPipeline` — only class that owns end-to-end sequence |
| `src/core/postprocess/postprocess.ts` | Nodal values, element gradients, solution summary for visualization |
| `src/core/tracing/traces.ts` | `AssemblyTrace`, `ElementComputationTrace`, `SolverTrace` |
| `src/ui/PlotlySurfacePlot.tsx` | Plotly 3D surface plot component |
| `src/App.tsx` | Application shell — owns the topic menu and nothing else |
| `src/topics/registry.ts` | The list of topics; the only place that knows which exist |
| `src/topics/types.ts` | `Topic` interface + `TopicStatus` |
| `src/topics/poisson/` | The Poisson FEM explorer topic (`PoissonTopic.tsx`, `meta.ts`) |

## Key Design Rules

- **Numerical core never imports from UI.** No React, no Plotly in `src/core/`.
- **All FEM math is hand-written TypeScript** — no numeric/math.js dependencies. Keep it that way; clarity over performance.
- **The dense LU solver is intentionally O(n³)** — suitable for small problems only. This is a teaching tool, not a production solver.
- **Stages are replaceable via interfaces** (`IProblemSetupStage`, `IMeshGenerationStage`, `IQuadratureStage`, etc.). New element types, solvers, or quadrature rules go in by implementing these interfaces.
- **`SimulationPipeline` is the only class that knows the full sequence.** Don't encode workflow logic elsewhere.
- **Trace objects are data, not logic.** Core emits them; UI reads them. No computation in traces.
- **Topics are self-contained.** Each topic owns its own layout, controls and state; the shell only
  renders the menu and the active topic. A topic's menu entry and page headline both read from its
  `meta.ts`, so they cannot drift apart.

## Extension Points

To add a new topic: create `src/topics/<name>/` with a `meta.ts` (an `Omit<Topic, 'View'>`)
and, once it has content, a component; then add the entry to `src/topics/registry.ts`. A topic listed
with `status: 'planned'` and no `View` renders the shared `PlannedTopic` stub from its `outline`.

To add a new element type, quadrature rule, or solver: implement the relevant interface from `contracts.ts` and register it via `StageRegistry`. Do not modify the pipeline or assembler.

## Dev Commands

```bash
npm run dev      # Vite dev server at localhost:5173
npm run build    # tsc -b + Vite production bundle
npm run preview  # preview production build
```
