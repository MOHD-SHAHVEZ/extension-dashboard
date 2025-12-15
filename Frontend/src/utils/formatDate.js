// src/utils/formatDate.js
export function formatDate(input) {
  try {
    const d = new Date(input)
    if (isNaN(d)) return input
    return d.toLocaleDateString()
  } catch {
    return input
  }
}
