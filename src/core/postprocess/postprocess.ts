import {
  createElementGeometry,
  physicalGradientsAt,
  referenceCentroid,
} from '../fem/elements.ts'
import { averagePoint, type Mesh, type Vector2 } from '../fem/mesh.ts'
import type { IFiniteElement } from '../fem/elements.ts'

export type ElementFieldSample = {
  elementId: number
  centroid: Vector2
  averageValue: number
  gradient: Vector2
}

export type SolutionSummary = {
  nodalValues: number[]
  elementSamples: ElementFieldSample[]
  minValue: number
  maxValue: number
  centerNodeId: number
  centerValue: number
}

export interface IPostprocessor {
  summarize(mesh: Mesh, finiteElement: IFiniteElement, solution: number[]): SolutionSummary
}

export class DefaultPostprocessor implements IPostprocessor {
  summarize(mesh: Mesh, finiteElement: IFiniteElement, solution: number[]): SolutionSummary {
    const refCentroid = referenceCentroid(finiteElement.kind)

    const elementSamples = mesh.elements.map((element) => {
      const geometry = createElementGeometry(mesh, element)
      const { gradients } = physicalGradientsAt(finiteElement, geometry, refCentroid)
      const localValues = element.nodeIds.map((id) => solution[id])
      const gradient = gradients.reduce(
        (acc, grad, index) => ({
          x: acc.x + grad.x * localValues[index],
          y: acc.y + grad.y * localValues[index],
        }),
        { x: 0, y: 0 },
      )
      const centroid = averagePoint(geometry.points)
      const averageValue = localValues.reduce((acc, value) => acc + value, 0) / localValues.length

      return {
        elementId: element.id,
        centroid,
        averageValue,
        gradient,
      }
    })

    const minValue = Math.min(...solution)
    const maxValue = Math.max(...solution)
    const centerNodeId = mesh.nodes.reduce((best, node) => {
      const bestDist = squaredDistance(mesh.nodes[best].point, { x: 0.5, y: 0.5 })
      const currentDist = squaredDistance(node.point, { x: 0.5, y: 0.5 })
      return currentDist < bestDist ? node.id : best
    }, 0)

    return {
      nodalValues: solution,
      elementSamples,
      minValue,
      maxValue,
      centerNodeId,
      centerValue: solution[centerNodeId],
    }
  }
}

function squaredDistance(a: Vector2, b: Vector2): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}
