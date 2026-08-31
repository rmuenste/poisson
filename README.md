# Numerics Explorer

A browser-based collection of interactive finite element topics. A menu at the
top of the page selects the topic; further topics are listed as *planned* until
they are implemented.

## Topics

- **Poisson Solver** — available. A 2D finite element prototype for
  `-Δu = 1` in `(0,1)^2`, with `u = 0` on `∂Ω`.
- **Discrete Projection** — available. Theory of Turek's PP scheme: from the
  incompressible Navier–Stokes equations through the pressure Schur complement
  to the five substeps of the discrete projection method, and why its pressure
  step is the Poisson problem the first topic assembles.
- **Convection–Diffusion**, **Time Stepping**, **Iterative Solvers** — planned;
  selecting one shows the coverage it is reserved for.

## The Poisson Solver Topic

Designed as both a solver and a teaching tool. It includes:

- a configurable FEM pipeline with replaceable stage services
- four element types: P1/P2 triangles and Q1/Q2 quadrilaterals
- switchable quadrature rules per element type (vertex/trapezoidal, centroid, Gauss)
- an interactive mesh view: click to select elements, hover for node info, and a
  toggleable boundary/free DOF overlay
- step-by-step inspection of mesh, FE space, quadrature, assembly, and solve stages
- interactive Plotly-based basis function visualizations

## Requirements

- `node`
- `npm`

## Install Dependencies

From the project root, run:

```bash
npm install
```

## Run The Development Server

Start the local Vite development server with:

```bash
npm run dev
```

Vite will print a local URL, typically:

```text
http://localhost:5173/
```

Open that URL in your browser.

## Build For Production

To create a production build:

```bash
npm run build
```

## Preview The Production Build

To preview the built app locally:

```bash
npm run preview
```

## Run The Tests

The test suite (vitest) covers shape functions, quadrature exactness, the
linear solver, the Dirichlet constraint handler, an end-to-end convergence
check of the solution's center value for all four element types, and the
projection scheme (that `P = B^T Ml^-1 B` really is the 5-point stencil, and
that the corrected velocity is discretely divergence-free to machine
precision):

```bash
npm test
```

## Project Notes

- Source code lives in [src](src).
- [src/App.tsx](src/App.tsx) is the shell: it renders the topic menu and the
  active topic, nothing more.
- Topics live in [src/topics](src/topics) and are registered in
  [src/topics/registry.ts](src/topics/registry.ts). The Poisson topic is
  [src/topics/poisson/PoissonTopic.tsx](src/topics/poisson/PoissonTopic.tsx);
  its stage views live in [src/ui/stages](src/ui/stages). The projection topic is
  [src/topics/projection](src/topics/projection), with its section views and
  inline-SVG figures in its own `sections/` and `figures/` folders.
- The numerical pipeline contracts are defined in
  [src/core/pipeline/contracts.ts](src/core/pipeline/contracts.ts).
- The current design principles are documented in
  [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md).
- The dense direct solver is intentionally O(n³) — this is a teaching tool, and
  the UI warns when the mesh grows large enough for solves to feel slow.
