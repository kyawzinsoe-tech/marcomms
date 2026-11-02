// Shared categorical palette: the same contributor keeps the same colour in every chart.
const PALETTE = ['#DC2626', '#0066E6', '#008A45', '#A21CAF', '#C65D00', '#007F8B', '#5B21B6', '#B51759'];
export function chartColor(index) { return PALETTE[index % PALETTE.length]; }
