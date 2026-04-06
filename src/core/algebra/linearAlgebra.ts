export class SparseMatrix {
  private readonly rows = new Map<number, Map<number, number>>()

  constructor(public readonly size: number) {}

  add(row: number, column: number, value: number): void {
    const rowMap = this.rows.get(row) ?? new Map<number, number>()
    rowMap.set(column, (rowMap.get(column) ?? 0) + value)
    this.rows.set(row, rowMap)
  }

  get(row: number, column: number): number {
    return this.rows.get(row)?.get(column) ?? 0
  }

  nonZeroCount(): number {
    let count = 0
    this.rows.forEach((row) => {
      count += row.size
    })
    return count
  }

  toDense(limit = this.size): number[][] {
    const actual = Math.min(limit, this.size)
    return Array.from({ length: actual }, (_, row) =>
      Array.from({ length: actual }, (_, column) => this.get(row, column)),
    )
  }

  rowEntries(row: number): Array<[number, number]> {
    return [...(this.rows.get(row)?.entries() ?? [])]
  }
}

export type ConstraintApplication = {
  matrix: number[][]
  rhs: number[]
}

export interface IConstraintHandler {
  applyHomogeneousDirichlet(
    matrix: SparseMatrix,
    rhs: number[],
    constrainedDofs: number[],
  ): ConstraintApplication
}

export class HomogeneousDirichletConstraintHandler implements IConstraintHandler {
  applyHomogeneousDirichlet(
    matrix: SparseMatrix,
    rhs: number[],
    constrainedDofs: number[],
  ): ConstraintApplication {
    const dense = matrix.toDense()
    const constrained = new Set(constrainedDofs)
    const constrainedRhs = [...rhs]

    for (let row = 0; row < dense.length; row += 1) {
      for (let column = 0; column < dense.length; column += 1) {
        if (constrained.has(row) || constrained.has(column)) {
          dense[row][column] = row === column && constrained.has(row) ? 1 : 0
        }
      }
    }

    constrained.forEach((dof) => {
      constrainedRhs[dof] = 0
    })

    return { matrix: dense, rhs: constrainedRhs }
  }
}

export interface ILinearSolver {
  readonly id: string
  solve(matrix: number[][], rhs: number[]): number[]
}

export class DenseDirectSolver implements ILinearSolver {
  readonly id = 'dense-direct'

  solve(matrix: number[][], rhs: number[]): number[] {
    const n = matrix.length
    const a = matrix.map((row) => [...row])
    const b = [...rhs]

    for (let pivot = 0; pivot < n; pivot += 1) {
      let maxRow = pivot
      for (let row = pivot + 1; row < n; row += 1) {
        if (Math.abs(a[row][pivot]) > Math.abs(a[maxRow][pivot])) {
          maxRow = row
        }
      }

      if (Math.abs(a[maxRow][pivot]) < 1e-12) {
        throw new Error(`Singular system detected at pivot ${pivot}.`)
      }

      ;[a[pivot], a[maxRow]] = [a[maxRow], a[pivot]]
      ;[b[pivot], b[maxRow]] = [b[maxRow], b[pivot]]

      for (let row = pivot + 1; row < n; row += 1) {
        const factor = a[row][pivot] / a[pivot][pivot]
        if (Math.abs(factor) < 1e-15) {
          continue
        }

        for (let column = pivot; column < n; column += 1) {
          a[row][column] -= factor * a[pivot][column]
        }
        b[row] -= factor * b[pivot]
      }
    }

    const solution = Array.from({ length: n }, () => 0)

    for (let row = n - 1; row >= 0; row -= 1) {
      let sum = b[row]
      for (let column = row + 1; column < n; column += 1) {
        sum -= a[row][column] * solution[column]
      }
      solution[row] = sum / a[row][row]
    }

    return solution
  }
}

export function residualNorm(matrix: number[][], rhs: number[], solution: number[]): number {
  let sum = 0

  for (let row = 0; row < matrix.length; row += 1) {
    let residual = -rhs[row]
    for (let column = 0; column < matrix[row].length; column += 1) {
      residual += matrix[row][column] * solution[column]
    }
    sum += residual * residual
  }

  return Math.sqrt(sum)
}
