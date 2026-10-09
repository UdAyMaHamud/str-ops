import React from 'react'
import { useGetIntegrationsQuery, useGetWorkflowRunsQuery } from '../store/api/systemApi'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { timeAgo, pct } from '../components/common/format'

const codeLevel = (code) => (code >= 500 ? 'critical' : code === 429 ? 'warning' : code >= 400 ? 'critical' : 'good')

const Integrations = () => {
  const { data, isLoading, error } = useGetIntegrationsQuery(undefined, { pollingInterval: 60000 })
  const { data: runData } = useGetWorkflowRunsQuery(undefined, { pollingInterval: 60000 })
  const integrations = data?.data || []
  const statusCodes = data?.statusCodes || {}
  const runs = runData?.data
  const healthy = integrations.filter((i) => i.health.level === 'good').length

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="Where every number comes from (Day 13 + 15). If something breaks: stop, capture the error without secrets, escalate within 15 minutes."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Tools healthy" value={`${healthy}/${integrations.length}`} />
        <StatCard title="Workflow runs (7 d)" value={runs?.totals.runs ?? '–'} />
        <StatCard title="Workflow errors (7 d)" value={runs?.totals.errors ?? '–'} sub={runs ? `${pct(runs.totals.errors / (runs.totals.runs || 1))} error rate` : ''} />
        <StatCard title="Distinct error causes" value={runs?.errorsByCause.length ?? '–'} />
      </div>

      <StateBlock isLoading={isLoading} error={error}>
        <div className="space-y-5">
          <Panel title="Connected tools" source="Dashboard secret store (keys are never shown here)" rule="Normal = 2xx and a successful sync inside the window. 401 → key problem, 429 → slow down, 5xx → their side.">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Tool</th>
                    <th className="py-2 pr-3 font-semibold">Feeds</th>
                    <th className="py-2 pr-3 font-semibold">Mode</th>
                    <th className="py-2 pr-3 font-semibold">Last sync</th>
                    <th className="py-2 pr-3 font-semibold">Last success</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {integrations.map((i) => (
                    <tr key={i._id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-[13px]">{i.name}</p>
                        <p className="text-[11px] text-muted">{i.category}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-2">{i.feeds.join(', ')}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{i.mode === 'webhook' ? 'Webhook (push)' : `Polling · ${i.intervalMin} min`}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{timeAgo(i.lastSyncAt)}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{timeAgo(i.lastSuccessAt)}</td>
                      <td className="py-2.5 pr-3 max-w-[260px]">
                        <StatusBadge level={codeLevel(i.lastStatus)}>{i.lastStatus}</StatusBadge>
                        <p className="text-[11px] text-ink-2 mt-1">{i.health.statusMeaning}</p>
                        {i.lastError && <p className="text-[11px] text-critical mt-0.5">{i.lastError}</p>}
                      </td>
                      <td className="py-2.5 max-w-[240px]">
                        <StatusBadge level={i.health.level}>{i.health.summary}</StatusBadge>
                        <p className="text-[11px] text-muted mt-1">{i.health.normalRule}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {runs && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              <Panel title="n8n workflows" source="n8n executions · last 7 days" rule="Worried if a workflow's last run failed, or its error rate goes above 10%.">
                <table className="w-full text-[12px] tabular">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                      <th className="py-2 pr-3 font-semibold">Workflow</th>
                      <th className="py-2 pr-3 font-semibold text-right">Runs</th>
                      <th className="py-2 pr-3 font-semibold text-right">Errors</th>
                      <th className="py-2 pr-3 font-semibold">Last run</th>
                      <th className="py-2 font-semibold">Last result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {runs.workflows.map((w) => (
                      <tr key={w.workflow}>
                        <td className="py-2 pr-3">{w.workflow}</td>
                        <td className="py-2 pr-3 text-right">{w.runs}</td>
                        <td className={`py-2 pr-3 text-right ${w.errors ? 'text-critical font-semibold' : ''}`}>{w.errors}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{timeAgo(w.lastRunAt)}</td>
                        <td className="py-2"><StatusBadge level={w.lastStatus === 'success' ? 'good' : 'critical'}>{w.lastStatus}</StatusBadge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              <Panel title="Errors grouped by cause" source="Track 5: read the error log, group by cause" rule="Fix the biggest cause first. Never paste keys into Slack, prompts or screenshots.">
                {runs.errorsByCause.length === 0 ? (
                  <StatusBadge level="good">No errors</StatusBadge>
                ) : (
                  <ul className="space-y-3">
                    {runs.errorsByCause.map((c) => (
                      <li key={c.cause}>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium">{c.cause}</span>
                          <span className="tabular text-ink-2">{c.count}×</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-page mt-1">
                          <div className="h-1.5 rounded-full bg-[#2a78d6]" style={{ width: pct(c.count / (runs.errorsByCause[0].count || 1)) }} />
                        </div>
                        <p className="text-[11px] text-muted mt-1">{c.workflows.join(', ')} · last {timeAgo(c.lastSeenAt)} · e.g. {c.example}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          )}

          <Panel title="Status codes in plain English" source="Workbook Day 13">
            <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(statusCodes).map(([code, text]) => (
                <div key={code} className="rounded-xl bg-page px-3 py-2">
                  <dt><StatusBadge level={codeLevel(Number(code))}>{code}</StatusBadge></dt>
                  <dd className="text-[12px] text-ink-2 mt-1">{text}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </StateBlock>
    </>
  )
}

export default Integrations
