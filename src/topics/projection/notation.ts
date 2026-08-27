/**
 * Symbols used throughout the topic, following Turek's own notation list.
 * Rendered as a card that stays visible while the reader moves between
 * sections, so no equation has to be read from memory.
 */
export interface NotationEntry {
  symbol: string
  meaning: string
}

export const notation: NotationEntry[] = [
  { symbol: 'u, p', meaning: 'velocity and pressure coefficient vectors' },
  { symbol: 'ν', meaning: 'viscosity' },
  { symbol: 'k', meaning: 'time step' },
  { symbol: 'θ, θᵢ', meaning: 'time-stepping weights' },
  { symbol: 'M', meaning: 'velocity mass matrix' },
  { symbol: 'Mₗ', meaning: 'lumped (diagonal) velocity mass matrix' },
  { symbol: 'M_p', meaning: 'pressure mass matrix' },
  { symbol: 'L', meaning: 'discrete Laplacian' },
  { symbol: 'K(·)', meaning: 'transport matrix of the convective term' },
  { symbol: 'S', meaning: 'velocity matrix αM + θ₁νkL + θ₂kK' },
  { symbol: 'B', meaning: 'gradient matrix' },
  { symbol: 'Bᵀ', meaning: 'divergence matrix' },
  { symbol: 'BᵀS⁻¹B', meaning: 'pressure Schur complement operator' },
  { symbol: 'P', meaning: 'reactive preconditioner BᵀMₗ⁻¹B' },
  { symbol: 'C', meaning: 'preconditioner of the basic iteration' },
]
