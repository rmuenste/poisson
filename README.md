# Poisson FEM Explorer

A browser-based 2D finite element prototype for the Poisson problem

`-Δu = 1` in `(0,1)^2`, with `u = 0` on `∂Ω`.

The app is designed as both a solver and a teaching tool. It includes:

- a configurable FEM pipeline with replaceable stage services
- linear triangular elements
- switchable quadrature rules
- step-by-step inspection of mesh, FE space, assembly, and solve stages
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

## Project Notes

- Source code lives in [src](/home/rmuenste/code/fun/poisson/src).
- The main app entry point is [src/App.tsx](/home/rmuenste/code/fun/poisson/src/App.tsx).
- The numerical pipeline contracts are defined in [src/core/pipeline/contracts.ts](/home/rmuenste/code/fun/poisson/src/core/pipeline/contracts.ts).
- The current design principles are documented in [DESIGN_PRINCIPLES.md](/home/rmuenste/code/fun/poisson/DESIGN_PRINCIPLES.md).
