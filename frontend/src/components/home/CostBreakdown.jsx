import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import Panel from '../common/Panel'
import { baseOptions, SERIES } from '../common/chartSetup'
import { money, pct } from '../common/format'

// ====== Where the money goes: donut + labelled legend (4 validated colors)
const CostBreakdown = ({ costs, days, className = '' }) => {
  const total = costs.reduce((s, c) => s + c.value, 0)

  return (
    <Panel title="Cost breakdown" source={`Last ${days} days`} rule="Net = total revenue − these costs." className={className}>
      <div className="relative h-44">
        <Doughnut
          data={{
            labels: costs.map((c) => c.name),
            datasets: [{ data: costs.map((c) => c.value), backgroundColor: SERIES, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
              legend: { display: false },
              tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (ctx) => ` ${ctx.label}: ${money(ctx.raw)} (${pct(ctx.raw / (total || 1))})` } },
            },
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[11px] text-muted">Total costs</p>
          <p className="text-[21px] font-bold tabular">{money(total)}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {costs.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[i] }} />
            <span className="flex-1 text-ink-2">{c.name}</span>
            <span className="font-semibold tabular">{money(c.value)}</span>
            <span className="w-10 text-right text-[11px] text-muted tabular">{pct(c.value / (total || 1))}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default CostBreakdown
