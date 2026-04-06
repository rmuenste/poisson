import type { Vector2 } from './mesh.ts'

export interface IWeakFormTerm {
  readonly id: string
}

export interface IBilinearFormTerm extends IWeakFormTerm {
  evaluate(gradU: Vector2, gradV: Vector2, point: Vector2): number
}

export interface ILinearFormTerm extends IWeakFormTerm {
  evaluate(shapeValue: number, point: Vector2): number
}

export class DiffusionTerm implements IBilinearFormTerm {
  readonly id = 'diffusion'

  evaluate(gradU: Vector2, gradV: Vector2): number {
    return gradU.x * gradV.x + gradU.y * gradV.y
  }
}

export class UnitLoadTerm implements ILinearFormTerm {
  readonly id = 'unit-load'

  evaluate(shapeValue: number): number {
    return shapeValue
  }
}

export class WeakForm {
  constructor(
    public readonly bilinearTerms: IBilinearFormTerm[],
    public readonly linearTerms: ILinearFormTerm[],
  ) {}
}

export function createPoissonWeakForm(): WeakForm {
  return new WeakForm([new DiffusionTerm()], [new UnitLoadTerm()])
}
