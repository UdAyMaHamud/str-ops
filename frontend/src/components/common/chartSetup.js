import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend)

// ====== Shared chart styling: thin marks, recessive grid, text in ink colors
ChartJS.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif"
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#8b948d'

// Categorical order validated with the dataviz palette checker (light, white surface)
export const SERIES = ['#2a8a55', '#8f7fd9', '#c98500', '#3f86c9']
// Single-series bars: soft green, best day highlighted in deep green
export const BAR_SOFT = '#b9d6c1'
export const BAR_STRONG = '#1f4a35'

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#141c17',
      bodyColor: '#59625c',
      borderColor: '#e3e9e4',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 4,
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { grid: { color: '#edf1ee' }, border: { display: false }, beginAtZero: true },
  },
}
