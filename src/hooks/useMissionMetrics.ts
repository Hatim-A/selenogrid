import { useEffect, useState } from 'react'
import { computeSiteMetrics } from '@/lib/metrics'
import type { Scenario, Site, SiteMetrics } from '@/types'

interface MissionResult {
  key: string
  metrics: Map<string, SiteMetrics>
  computeMs: number
}

const cache = new Map<string, MissionResult>()
const MAX_CACHE = 6

function scenarioKey(scenario: Scenario, sites: Site[]): string {
  return `${scenario.startIso}|${scenario.days}|${scenario.stepHours}|${sites.map((s) => s.id).join(',')}`
}

/**
 * Compute (or reuse) trajectories for every curated site so the atlas and
 * detail views stay instant when the comparison selection changes.
 */
export function useMissionMetrics(
  sites: Site[],
  scenario: Scenario,
  enabled = true,
): { metrics: Map<string, SiteMetrics> | null; computing: boolean; computeMs: number } {
  const key = scenarioKey(scenario, sites)
  const [result, setResult] = useState<MissionResult | null>(() => cache.get(key) ?? null)

  useEffect(() => {
    if (!enabled || sites.length === 0) return
    const cached = cache.get(key)
    if (cached) {
      setResult(cached)
      return
    }
    let cancelled = false
    const handle = window.setTimeout(() => {
      const t0 = performance.now()
      const list = computeSiteMetrics(sites, scenario)
      const map = new Map(list.map((m) => [m.siteId, m]))
      const next: MissionResult = {
        key,
        metrics: map,
        computeMs: performance.now() - t0,
      }
      cache.set(key, next)
      if (cache.size > MAX_CACHE) {
        const first = cache.keys().next().value
        if (first) cache.delete(first)
      }
      if (!cancelled) {
        setResult(next)
      }
    }, 24)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [enabled, key, scenario, sites])

  const active = result?.key === key ? result : null
  return {
    metrics: active?.metrics ?? null,
    computing: enabled && !active,
    computeMs: active?.computeMs ?? 0,
  }
}
