import * as React from 'react'
import Plotly from 'plotly.js-dist-min'
import type { Config, Data, Layout } from 'plotly.js'

type PlotlySurfacePlotProps = {
  color: string
  evaluate: (x: number, y: number) => number
  label: string
}

type Mesh3DTrace = {
  type: 'mesh3d'
  x: number[]
  y: number[]
  z: number[]
  i: Int32Array
  j: Int32Array
  k: Int32Array
  intensity: number[]
  flatshading: boolean
  colorscale: Array<[number, string]>
  hovertemplate: string
  customdata: Array<[number, number, number]>
  showscale: boolean
  opacity: number
  lighting: {
    ambient: number
    diffuse: number
    specular: number
    roughness: number
    fresnel: number
  }
  lightposition: {
    x: number
    y: number
    z: number
  }
  contour: {
    show: boolean
    color: string
    width: number
  }
}

type Scatter3DTrace = {
  type: 'scatter3d'
  mode: 'text+markers'
  x: number[]
  y: number[]
  z: number[]
  text: string[]
  textposition: 'top center'
  marker: {
    size: number
    color: string
  }
  hovertemplate: string
}

type AxisSpec = {
  title: { text: string }
  range: [number, number]
  backgroundcolor: string
  gridcolor: string
  zerolinecolor: string
}

type PlotlyHTMLElement = HTMLDivElement & {
  data?: unknown
  layout?: unknown
}

export function PlotlySurfacePlot({
  color,
  evaluate,
  label,
}: PlotlySurfacePlotProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const trace = buildSurfaceTrace(color, evaluate)
    const vertexTrace = buildVertexTrace(color, evaluate)
    const layout: Partial<Layout> = {
      paper_bgcolor: 'rgba(255,248,239,0)',
      plot_bgcolor: 'rgba(255,248,239,0)',
      margin: { l: 0, r: 0, t: 28, b: 0 },
      scene: {
        aspectmode: 'cube',
        camera: {
          eye: { x: 1.48, y: -1.6, z: 1.1 },
        },
        xaxis: axis('ξ'),
        yaxis: axis('η'),
        zaxis: axis('value'),
      },
      showlegend: false,
      uirevision: `${label}-surface`,
    }
    const config: Partial<Config> = {
      displayModeBar: true,
      responsive: true,
    }

    void Plotly.react(
      container as PlotlyHTMLElement,
      [trace as Data, vertexTrace as Data],
      layout,
      config,
    )

    return () => {
      void Plotly.purge(container as PlotlyHTMLElement)
    }
  }, [color, evaluate, label])

  return <div ref={containerRef} className="plotly-surface" aria-label={`${label} surface plot`} />
}

function buildSurfaceTrace(
  color: string,
  evaluate: (x: number, y: number) => number,
): Mesh3DTrace {
  const resolution = 16
  const x: number[] = []
  const y: number[] = []
  const z: number[] = []
  const intensity: number[] = []
  const customdata: Array<[number, number, number]> = []
  const i: number[] = []
  const j: number[] = []
  const k: number[] = []
  const indexGrid: number[][] = []

  for (let row = 0; row <= resolution; row += 1) {
    indexGrid[row] = []
    for (let column = 0; column <= resolution - row; column += 1) {
      const xi = column / resolution
      const eta = row / resolution
      const value = evaluate(xi, eta)
      indexGrid[row][column] = x.length
      x.push(xi)
      y.push(eta)
      z.push(value)
      intensity.push(value)
      customdata.push([xi, eta, value])
    }
  }

  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution - row; column += 1) {
      const a = indexGrid[row][column]
      const b = indexGrid[row][column + 1]
      const c = indexGrid[row + 1][column]
      i.push(a)
      j.push(b)
      k.push(c)

      if (column < resolution - row - 1) {
        const d = indexGrid[row + 1][column + 1]
        i.push(b)
        j.push(d)
        k.push(c)
      }
    }
  }

  return {
    type: 'mesh3d',
    x,
    y,
    z,
    i: Int32Array.from(i),
    j: Int32Array.from(j),
    k: Int32Array.from(k),
    intensity,
    flatshading: false,
    colorscale: [
      [0, softenColor(color, 0.48)],
      [0.55, softenColor(color, 0.78)],
      [1, color],
    ],
    hovertemplate:
      'ξ=%{customdata[0]:.3f}<br>η=%{customdata[1]:.3f}<br>value=%{customdata[2]:.3f}<extra></extra>',
    customdata,
    showscale: false,
    opacity: 0.98,
    lighting: {
      ambient: 0.7,
      diffuse: 0.8,
      specular: 0.2,
      roughness: 0.85,
      fresnel: 0.1,
    },
    lightposition: {
      x: 90,
      y: -120,
      z: 180,
    },
    contour: {
      show: true,
      color: 'rgba(29, 35, 46, 0.25)',
      width: 1,
    },
  }
}

function buildVertexTrace(
  color: string,
  evaluate: (x: number, y: number) => number,
): Scatter3DTrace {
  const vertices: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [0, 1],
  ]

  return {
    type: 'scatter3d',
    mode: 'text+markers',
    x: vertices.map(([x]) => x),
    y: vertices.map(([, y]) => y),
    z: vertices.map(([x, y]) => evaluate(x, y)),
    text: ['(0,0)', '(1,0)', '(0,1)'],
    textposition: 'top center',
    marker: {
      size: 4,
      color,
    },
    hovertemplate: 'vertex: %{text}<br>value=%{z:.3f}<extra></extra>',
  }
}

function axis(title: string): AxisSpec {
  return {
    title: { text: title },
    range: [0, 1.02],
    backgroundcolor: 'rgba(244, 235, 221, 0.95)',
    gridcolor: 'rgba(70, 70, 80, 0.14)',
    zerolinecolor: 'rgba(70, 70, 80, 0.18)',
  }
}

function softenColor(hex: string, factor: number): string {
  const rgb = hex
    .replace('#', '')
    .match(/.{1,2}/g)
    ?.map((chunk) => Number.parseInt(chunk, 16))

  if (!rgb || rgb.length !== 3) {
    return hex
  }

  const mixed = rgb.map((channel) => Math.round(255 - (255 - channel) * factor))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}
