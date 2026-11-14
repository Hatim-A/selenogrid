import { useEffect, useState } from 'react'
import { loadSiteDataset } from '@/lib/data'
import type { SiteDataset } from '@/types'

interface DatasetState {
  data: SiteDataset | null
  error: string | null
}

export function useSiteDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    loadSiteDataset()
      .then((data) => {
        if (!cancelled) setState({ data, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : 'Could not load site data',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
