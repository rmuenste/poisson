# Design Principles

This project aims to implement a 2D FEM web application for the Poisson problem

`-Delta u = 1` in `(0,1)^2`, with `u = 0` on `partial Omega`.

The application should not only compute a solution, but also expose the internal
machinery of the finite element method in a way that is inspectable, traceable,
and configurable.

## Goals

- Build a browser-based FEM application with a TypeScript numerical core.
- Use linear triangular elements for the initial implementation.
- Use a switchable numerical integration layer, with the trapezoidal rule as an
  initial choice.
- Make the core FEM building blocks configurable from the beginning.
- Keep the numerical implementation cleanly separated from UI and educational
  concerns.

## Architectural Principle

The architecture should be divided into three major layers:

1. Numerical core
2. Inspection and tracing
3. Application and UI orchestration

The numerical core performs the mathematical work. The inspection layer records
what happened in a structured form. The application layer coordinates the full
workflow and adapts core data for visualization and interaction.

The dependency direction should be:

`Problem / Mesh / FE / WeakForm / Integrator / Assembler / Solver -> Trace objects -> UI`

The UI must depend on the numerical core, but the numerical core must never
depend on rendering, presentation, or teaching-specific logic.

## Separation of Concerns

### 1. Domain Model

These classes describe the mathematical problem, but do not solve it.

- `ProblemDefinition`: domain, PDE coefficients, source term, boundary data
- `BoundaryCondition`: abstract representation of boundary constraints
- `DirichletBoundaryCondition`: homogeneous Dirichlet condition for v1
- `DomainGeometry`: geometric description of the computational domain

### 2. Discretization Model

These classes define the mesh and finite element space, but do not assemble the
global system.

- `Mesh`: nodes, elements, boundary entities, and markers
- `TriangleElement`: element connectivity
- `FiniteElementSpace`: degrees of freedom, local-to-global maps, constrained
  degrees of freedom
- `LinearTriangularElement`: basis functions and FE-specific local behavior

### 3. Element Mathematics

These classes operate locally on a single element.

- `ReferenceElement`: reference triangle shape functions and reference
  gradients
- `ElementMapping`: Jacobian, determinant, inverse transform, physical mapping
- `QuadratureRule`: quadrature points and weights
- `ElementIntegrator`: computation of local element matrices and vectors

### 4. Variational Formulation

These classes describe what is being integrated, independent of the mesh and
global algebra structures.

- `BilinearFormTerm`: terms such as `grad u . grad v`
- `LinearFormTerm`: terms such as `f v`
- `WeakForm`: collection of bilinear and linear contributions

### 5. Global Algebra

These classes assemble and solve the linear system, but do not define basis
functions or UI behavior.

- `Assembler`: loops over elements and accumulates local contributions
- `SparseMatrix`: global matrix container
- `Vector`: global vector container
- `ConstraintHandler`: application of Dirichlet constraints
- `LinearSolver`: solver interface

### 6. Postprocessing

These classes analyze and evaluate the discrete solution after the solve.

- `DiscreteSolution`: solution vector attached to a finite element space
- `SolutionEvaluator`: pointwise evaluation of values and gradients
- `ErrorAnalyzer`: optional error and diagnostic computations

### 7. Inspection and Tracing

The core classes may emit structured trace objects, but trace objects are not
responsible for computation.

- `AssemblyTrace`
- `ElementComputationTrace`
- `QuadratureTrace`
- `SolverTrace`

These objects exist to support deep inspection of assembly, element evaluation,
integration, and solver behavior in the UI.

### 8. Application Layer

These classes coordinate the end-to-end workflow and expose data to the user
interface.

- `SimulationConfig`: mesh density, quadrature choice, solver choice, trace
  detail level
- `SimulationPipeline`: setup, discretization, assembly, constraint
  application, solve, and postprocessing
- `VisualizationPresenter`: transforms core and trace data into renderable UI
  models

## Responsibility Rules

Each class should own one stable concept.

- `Mesh` owns topology and geometry data, not basis-function math.
- `LinearTriangularElement` owns local basis definitions, not global assembly.
- `QuadratureRule` owns points and weights, not element transforms.
- `ElementIntegrator` combines element definitions, mappings, quadrature, and
  weak-form terms to produce local contributions.
- `Assembler` is responsible only for local-to-global accumulation.
- `ConstraintHandler` applies boundary constraints explicitly, rather than
  hiding them inside the assembler.
- `SimulationPipeline` is the only class that should understand the full
  end-to-end sequence.

## Configurability Principles

The first implementation will target linear triangular elements and a simple
Poisson model, but the architecture should not hardcode those choices more than
necessary.

The following interfaces should be introduced early:

- `IFiniteElement`
- `IQuadratureRule`
- `ILinearSolver`
- `IWeakFormTerm`
- `IBoundaryCondition`

This allows the project to evolve toward different element families,
integration schemes, solver backends, and problem types without rewriting the
entire codebase.

## Educational Design Principle

This project is not only a solver. It is also a teaching tool.

For that reason, inspection should be a first-class capability, but it should
not be implemented by mixing UI logic directly into numerical classes. The
recommended approach is:

- core classes perform computations
- core classes optionally emit structured trace objects
- the UI consumes trace objects to explain each FEM step

This preserves numerical clarity while still enabling deep insight into:

- mesh construction
- basis functions and local spaces
- weak form construction
- numerical integration
- local element matrices and vectors
- global assembly
- boundary condition enforcement
- linear system solution

## Quality Guidelines

- Prefer explicit data flow over hidden side effects.
- Keep mathematical definitions separate from orchestration logic.
- Favor replaceable interfaces at major extension points.
- Make every major computational step inspectable.
- Avoid coupling numerical code to rendering or UI state management.
- Preserve the ability to test core classes independently of the web frontend.

## Summary

The project should be structured around a clean object-oriented FEM core, a
separate trace layer for deep inspection, and an application layer that
coordinates the interactive web experience. This separation gives the project
three important properties:

- mathematical clarity
- configurability of core FEM components
- strong support for educational visualization and explanation
