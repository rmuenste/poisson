import { describe, expect, it } from 'vitest'
import {
  DenseDirectSolver,
  HomogeneousDirichletConstraintHandler,
  SparseMatrix,
  residualNorm,
} from './linearAlgebra.ts'

describe('DenseDirectSolver', () => {
  it('solves a known 3x3 system', () => {
    const matrix = [
      [4, 1, 0],
      [1, 4, 1],
      [0, 1, 4],
    ]
    const rhs = [5, 6, 5]
    const solution = new DenseDirectSolver().solve(matrix, rhs)
    expect(solution[0]).toBeCloseTo(1, 10)
    expect(solution[1]).toBeCloseTo(1, 10)
    expect(solution[2]).toBeCloseTo(1, 10)
    expect(residualNorm(matrix, rhs, solution)).toBeLessThan(1e-10)
  })

  it('pivots when the leading entry is zero', () => {
    const matrix = [
      [0, 1],
      [1, 0],
    ]
    const solution = new DenseDirectSolver().solve(matrix, [2, 3])
    expect(solution[0]).toBeCloseTo(3, 12)
    expect(solution[1]).toBeCloseTo(2, 12)
  })

  it('throws on a singular system', () => {
    const matrix = [
      [1, 2],
      [2, 4],
    ]
    expect(() => new DenseDirectSolver().solve(matrix, [1, 2])).toThrow(/Singular/)
  })
})

describe('HomogeneousDirichletConstraintHandler', () => {
  it('replaces constrained rows/columns with identity and zeroes the rhs', () => {
    const sparse = new SparseMatrix(3)
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        sparse.add(i, j, 1 + i + j)
      }
    }
    const { matrix, rhs } = new HomogeneousDirichletConstraintHandler().applyHomogeneousDirichlet(
      sparse,
      [7, 8, 9],
      [0, 2],
    )
    expect(matrix[0]).toEqual([1, 0, 0])
    expect(matrix[2]).toEqual([0, 0, 1])
    expect(matrix[1]).toEqual([0, 3, 0])
    expect(rhs).toEqual([0, 8, 0])
  })
})

describe('SparseMatrix', () => {
  it('accumulates duplicate entries and counts nonzeros', () => {
    const sparse = new SparseMatrix(2)
    sparse.add(0, 1, 2)
    sparse.add(0, 1, 3)
    expect(sparse.get(0, 1)).toBe(5)
    expect(sparse.get(1, 0)).toBe(0)
    expect(sparse.nonZeroCount()).toBe(1)
  })
})
