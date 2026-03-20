import { FormEvent, useEffect, useMemo, useState } from 'react'
import { featuresAdminApi } from '../services/platformApi'
import type { TenantFeaturePage, TenantWithFeatureSummary } from '../types/platform'

const SUPPLEMENTAL_FEATURE_PAGES: TenantFeaturePage[] = [
  { key: 'pwd_info', label: 'PwD Info', path: '/pwd-info', group: 'Centre Records' },
  { key: 'umcs', label: "UMC's", path: '/umcs', group: 'Centre Records' },
  { key: 'stickers', label: 'Stickers', path: '/stickers', group: 'Centre Records' },
  { key: 'performas', label: "Performa's", path: '/performas', group: 'Centre Records' },
  { key: 'candidates', label: 'Candidate Details', path: '/candidate-details', group: 'Centre Records' },
  { key: 'dispatch_slip', label: 'Dispatch Slip', path: '/dispatch-slip', group: 'Centre Records' },
  { key: 'remuneration', label: 'Remuneration', path: '/remuneration', group: 'Centre Records' },
]

const mergeFeaturePages = (pages: TenantFeaturePage[]): TenantFeaturePage[] => {
  const byKey = new Map<string, TenantFeaturePage>()

  pages.forEach((page) => byKey.set(page.key, page))
  SUPPLEMENTAL_FEATURE_PAGES.forEach((page) => {
    if (!byKey.has(page.key)) {
      byKey.set(page.key, page)
    }
  })

  return Array.from(byKey.values())
}

export function FeaturesPage() {
  const [search, setSearch] = useState('')
  const [pages, setPages] = useState<TenantFeaturePage[]>([])
  const [tenants, setTenants] = useState<TenantWithFeatureSummary[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant._id === selectedTenantId) || null,
    [selectedTenantId, tenants],
  )

  const groupedPages = useMemo(() => {
    return pages.reduce<Record<string, TenantFeaturePage[]>>((acc, page) => {
      if (!acc[page.group]) {
        acc[page.group] = []
      }
      acc[page.group].push(page)
      return acc
    }, {})
  }, [pages])

  const showSuccess = (message: string) => {
    setSuccess(message)
    window.setTimeout(() => setSuccess(''), 3000)
  }

  const loadPages = async () => {
    const response = await featuresAdminApi.listPages()
    setPages(mergeFeaturePages(response))
  }

  const loadTenants = async (searchText = search) => {
    const response = await featuresAdminApi.listTenants(searchText)
    setTenants(response)

    if (response.length > 0 && !response.some((item) => item._id === selectedTenantId)) {
      setSelectedTenantId(response[0]._id)
    }
  }

  const loadTenantFeatures = async (tenantId: string) => {
    setDetailLoading(true)
    try {
      const response = await featuresAdminApi.getTenantFeatures(tenantId)
      setToggles(response.toggles)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPages(), loadTenants('')])
      .catch((err: unknown) => {
        const message = typeof err === 'object' && err && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load features')
          : 'Failed to load features'
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTenantId) return

    loadTenantFeatures(selectedTenantId).catch((err: unknown) => {
      const message = typeof err === 'object' && err && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to load tenant features')
        : 'Failed to load tenant features'
      setError(message)
    })
  }, [selectedTenantId])

  const handleSearchSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await loadTenants(search)
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to search tenants')
        : 'Failed to search tenants'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const saveToggles = async (nextToggles: Record<string, boolean>, successMessage: string, key: string | null) => {
    if (!selectedTenantId) return

    setSavingKey(key)
    setError('')
    try {
      const response = await featuresAdminApi.updateTenantFeatures(selectedTenantId, nextToggles)
      setToggles(response.toggles)
      showSuccess(successMessage)
      await loadTenants(search)
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'response' in err
        ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update features')
        : 'Failed to update features'
      setError(message)
      throw err
    } finally {
      setSavingKey(null)
    }
  }

  const handleToggle = async (featureKey: string, enabled: boolean) => {
    const previous = toggles
    const nextToggles = { ...previous, [featureKey]: enabled }
    setToggles(nextToggles)

    try {
      await saveToggles(
        nextToggles,
        `Feature ${enabled ? 'enabled' : 'disabled'} successfully`,
        featureKey,
      )
    } catch {
      setToggles(previous)
    }
  }

  const handleToggleAll = async (enabled: boolean) => {
    const previous = toggles
    const nextToggles = pages.reduce<Record<string, boolean>>((acc, page) => {
      acc[page.key] = enabled
      return acc
    }, {})
    setToggles(nextToggles)

    try {
      await saveToggles(nextToggles, `All features ${enabled ? 'enabled' : 'disabled'} for tenant`, null)
    } catch {
      setToggles(previous)
    }
  }

  const disabledCount = Object.values(toggles).filter((value) => value === false).length

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 16 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 8 }}>Features</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Enable or disable tenant pages for end users.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {error && <span className="error-text" style={{ margin: 0 }}>{error}</span>}
          {success && <span className="success-text" style={{ margin: 0 }}>{success}</span>}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="card-title">Tenants</h2>
          <form onSubmit={handleSearchSubmit} className="grid" style={{ gap: 12, marginBottom: 16 }}>
            <input
              placeholder="Search tenant slug, name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="secondary" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Searching...' : 'Apply Filter'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setSearch('')
                  loadTenants('').catch(() => {
                    setError('Failed to reset tenant list')
                  })
                }}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="tenant-list" style={{ maxHeight: 480, overflowY: 'auto' }}>
            {tenants.map((tenant) => {
              const isSelected = tenant._id === selectedTenantId
              return (
                <button
                  key={tenant._id}
                  type="button"
                  className={isSelected ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedTenantId(tenant._id)}
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: '10px 12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{tenant.slug}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tenant.name}</div>
                  </div>
                  <span className="rollout-badge sm">
                    {tenant.featureSummary?.disabled || 0} off
                  </span>
                </button>
              )
            })}
            {tenants.length === 0 && (
              <div className="empty-state">No tenants found.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
            <div>
              <h2 className="card-title" style={{ marginBottom: 6 }}>Page Access</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedTenant
                  ? `${selectedTenant.slug} (${disabledCount} disabled of ${pages.length})`
                  : 'Select a tenant to manage page access'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="ghost"
                disabled={!selectedTenant || detailLoading || savingKey !== null}
                onClick={() => handleToggleAll(false)}
              >
                Disable All
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!selectedTenant || detailLoading || savingKey !== null}
                onClick={() => handleToggleAll(true)}
              >
                Enable All
              </button>
            </div>
          </div>

          {!selectedTenant && (
            <div className="empty-state">Select a tenant from the left list.</div>
          )}

          {selectedTenant && detailLoading && (
            <div className="empty-state">Loading tenant feature configuration...</div>
          )}

          {selectedTenant && !detailLoading && (
            <div className="grid" style={{ gap: 14 }}>
              {Object.entries(groupedPages).map(([groupName, groupItems]) => (
                <div key={groupName} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 12 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{groupName}</h3>
                  <div className="grid" style={{ gap: 8 }}>
                    {groupItems.map((page) => {
                      const enabled = toggles[page.key] !== false
                      const isSaving = savingKey === page.key

                      return (
                        <div
                          key={page.key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 12,
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            background: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{page.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{page.path}</div>
                          </div>
                          <button
                            type="button"
                            className={enabled ? 'secondary' : 'ghost'}
                            disabled={savingKey !== null}
                            onClick={() => handleToggle(page.key, !enabled)}
                            style={{ minWidth: 108 }}
                          >
                            {isSaving ? 'Saving...' : enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
