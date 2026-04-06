import type { Vector2 } from '../fem/mesh.ts'

export interface IBoundaryCondition {
  readonly type: 'dirichlet'
  value(point: Vector2): number
  isOnBoundary(point: Vector2): boolean
}

export interface IProblemDefinition {
  readonly id: string
  readonly title: string
  readonly equation: string
  readonly weakFormText: string
  readonly sourceText: string
  readonly boundaryCondition: IBoundaryCondition
  source(point: Vector2): number
}

export class DirichletBoundaryCondition implements IBoundaryCondition {
  readonly type = 'dirichlet' as const

  value(_point: Vector2): number {
    return 0
  }

  isOnBoundary(point: Vector2): boolean {
    const eps = 1e-12
    return (
      point.x < eps ||
      point.y < eps ||
      Math.abs(point.x - 1) < eps ||
      Math.abs(point.y - 1) < eps
    )
  }
}

export class UnitSquarePoissonProblem implements IProblemDefinition {
  readonly id = 'poisson-unit-square'
  readonly title = 'Poisson on the unit square'
  readonly equation = '-Δu = 1 in Ω = (0,1)^2,  u = 0 on ∂Ω'
  readonly weakFormText = 'Find u ∈ H_0^1(Ω) such that ∫Ω ∇u · ∇v dx = ∫Ω 1 · v dx for all v ∈ H_0^1(Ω).'
  readonly sourceText = 'f(x, y) = 1'
  readonly boundaryCondition = new DirichletBoundaryCondition()

  source(_point: Vector2): number {
    return 1
  }
}
