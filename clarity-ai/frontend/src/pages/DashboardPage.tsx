import { useEffect, useState } from 'react'
import { getDashboard, getPatterns, type DashboardStats } from '../api'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [patterns, setPatterns] = useState<{
    period: string
    patterns: { type: string; data: Record<string, number> }[]
    emotional_trends: Record<string, unknown>
    insights: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getDashboard(), getPatterns()])
      .then(([s, p]) => {
        setStats(s)
        setPatterns(p)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-lg bg-red-900/40 border border-red-800 text-red-300">
        {error}
        <p className="text-sm mt-2 text-gray-400">
          Make sure the backend server is running on port 8000.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Entries" value={stats?.total_entries ?? 0} />
        <MetricCard label="Total Chunks" value={stats?.total_chunks ?? 0} />
        <MetricCard
          label="Top Emotion"
          value={stats?.top_emotions?.[0]?.emotion ?? '—'}
        />
        <MetricCard
          label="Top Theme"
          value={stats?.top_themes?.[0]?.theme ?? '—'}
        />
      </div>

      {/* Emotions */}
      <Section title="Top Emotions">
        {stats?.top_emotions?.length ? (
          <div className="flex flex-wrap gap-2">
            {stats.top_emotions.map((e) => (
              <span
                key={e.emotion}
                className="px-3 py-1.5 rounded-full bg-indigo-900/40 border border-indigo-800 text-indigo-200 text-sm"
              >
                {e.emotion} <span className="text-indigo-400 ml-1">{e.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No emotions detected yet.</p>
        )}
      </Section>

      {/* Themes */}
      <Section title="Top Themes">
        {stats?.top_themes?.length ? (
          <div className="flex flex-wrap gap-2">
            {stats.top_themes.map((t) => (
              <span
                key={t.theme}
                className="px-3 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-800 text-emerald-200 text-sm"
              >
                {t.theme} <span className="text-emerald-400 ml-1">{t.count}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No themes detected yet.</p>
        )}
      </Section>

      {/* Patterns */}
      {patterns && patterns.patterns.length > 0 && (
        <Section title={`Recurring Patterns (${patterns.period})`}>
          {patterns.patterns.map((p, i) => (
            <div key={i} className="text-sm text-gray-300">
              <span className="font-medium capitalize">{p.type.replace(/_/g, ' ')}:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(p.data).map(([key, val]) => (
                  <span
                    key={key}
                    className="px-2 py-1 rounded bg-gray-800 text-gray-300 text-xs"
                  >
                    {key}: {val}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Insights */}
      {patterns?.insights && patterns.insights.length > 0 && (
        <Section title="Insights">
          <ul className="space-y-2">
            {patterns.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-indigo-400 mt-0.5">💡</span>
                {insight}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recent entries */}
      {stats?.recent_entries && stats.recent_entries.length > 0 && (
        <Section title="Recent Entries">
          <div className="space-y-2">
            {stats.recent_entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-300 font-medium">{entry.filename}</span>
                  <span className="text-gray-500 text-xs">{entry.uploaded_at}</span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">
                  {entry.text || 'No preview available'}
                </p>
                {entry.emotions.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {entry.emotions.map((em) => (
                      <span
                        key={em}
                        className="px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300 text-[10px]"
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-gray-900/80 border border-gray-800">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{title}</h2>
      {children}
    </div>
  )
}