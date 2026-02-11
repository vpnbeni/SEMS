import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { Dialog } from '../components/Dialog'
import { tenantAdminApi } from '../services/platformApi'
import type { PlatformAdmin, Tenant } from '../types/platform'

interface TenantDraft {
  name: string
  adminEmail: string
}

interface TenantsPageProps {
  admin: PlatformAdmin
  navigateTo: (path: string) => void
  currentPath: string
}

const TENANT_ROUTE_REGEX = /^\/tenants\/([a-f0-9]{24})\/?$/i

const parseTenantIdFromPath = (pathname: string): string | null => {
  const match = pathname.match(TENANT_ROUTE_REGEX)
  return match ? match[1] : null
}

const buildTenantPath = (tenantId: string) => `/tenants/${tenantId}`

export function TenantsPage({ admin, navigateTo, currentPath }: TenantsPageProps) {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantDrafts, setTenantDrafts] = useState<Record<string, TenantDraft>>({})
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [deleteSlugInput, setDeleteSlugInput] = useState('')
  const [verifiedDeleteSlug, setVerifiedDeleteSlug] = useState('')

  const [newTenant, setNewTenant] = useState({
    slug: '',
    name: '',
    adminEmail: '',
    adminPassword: '',
  })

  const selectedTenantId = useMemo(() => parseTenantIdFromPath(currentPath), [currentPath])
  const isTenantDetailPage = Boolean(selectedTenantId)

  const initializeDrafts = (items: Tenant[]) => {
    const drafts: Record<string, TenantDraft> = {}
    items.forEach((tenant) => {
      drafts[tenant._id] = {
        name: tenant.name,
        adminEmail: tenant.adminEmail,
      }
    })
    setTenantDrafts((prev) => ({ ...prev, ...drafts }))
  }

  const loadTenants = async (searchText = search) => {
    const response = await tenantAdminApi.list(searchText)
    setTenants(response.items)
    initializeDrafts(response.items)
  }

  const refreshSuccess = (message: string) => {
    setSuccess(message)
    window.setTimeout(() => setSuccess(''), 5000)
  }

  useEffect(() => {
    loadTenants('').catch((err: unknown) => {
      const fallbackMessage = 'Failed to load tenants'
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response
        setError(response?.data?.message || fallbackMessage)
        return
      }
      setError(fallbackMessage)
    })
  }, [])

  useEffect(() => {
    if (!selectedTenantId) {
      setSelectedTenant(null)
      return
    }

    const existing = tenants.find((tenant) => tenant._id === selectedTenantId)
    if (existing) {
      setSelectedTenant(existing)
    }

    let cancelled = false
    setDetailLoading(true)

    tenantAdminApi
      .getById(selectedTenantId)
      .then((tenant) => {
        if (cancelled) return

        setSelectedTenant(tenant)
        setTenantDrafts((prev) => ({
          ...prev,
          [tenant._id]: {
            name: tenant.name,
            adminEmail: tenant.adminEmail,
          },
        }))
      })
      .catch((err: unknown) => {
        if (cancelled) return

        const message = typeof err === 'object' && err && 'response' in err
          ? ((err as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message || 'Failed to load tenant details')
          : 'Failed to load tenant details'

        setError(message)

        const status = typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined

        if (status === 404) {
          navigateTo('/')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedTenantId, tenants, navigateTo])

  const handleCreateTenant = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const payload = {
        slug: newTenant.slug.trim().toLowerCase(),
        name: newTenant.name.trim(),
        adminEmail: newTenant.adminEmail.trim().toLowerCase(),
        ...(newTenant.adminPassword ? { adminPassword: newTenant.adminPassword } : {}),
      }

      const response = await tenantAdminApi.create(payload)
      await loadTenants('')
      setNewTenant({ slug: '', name: '', adminEmail: '', adminPassword: '' })

      if (response.generatedPassword) {
        refreshSuccess(`Tenant created. Password: ${response.generatedPassword}`)
      } else {
        refreshSuccess('Tenant created successfully')
      }
      setIsCreateDialogOpen(false)
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response
        setError(response?.data?.message || 'Failed to create tenant')
      } else {
        setError('Failed to create tenant')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTenantUpdate = async (tenantId: string) => {
    const draft = tenantDrafts[tenantId]
    if (!draft) return

    setLoading(true)
    setError('')

    try {
      const updated = await tenantAdminApi.update(tenantId, {
        name: draft.name,
        adminEmail: draft.adminEmail,
      })

      setSelectedTenant((prev) => (prev && prev._id === updated._id ? updated : prev))
      await loadTenants(search)
      refreshSuccess('Tenant updated')
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response
        setError(response?.data?.message || 'Failed to update tenant')
      } else {
        setError('Failed to update tenant')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (tenant: Tenant) => {
    setLoading(true)
    setError('')

    try {
      const updatedTenant = tenant.status === 'active'
        ? await tenantAdminApi.suspend(tenant._id)
        : await tenantAdminApi.activate(tenant._id)

      refreshSuccess(`Tenant ${updatedTenant.slug} ${updatedTenant.status === 'active' ? 'activated' : 'suspended'}`)
      setSelectedTenant((prev) => (prev && prev._id === updatedTenant._id ? updatedTenant : prev))
      await loadTenants(search)
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response
        setError(response?.data?.message || 'Failed to change status')
      } else {
        setError('Failed to change status')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTenantRowKeyDown = (event: KeyboardEvent<HTMLDivElement>, tenantId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigateTo(buildTenantPath(tenantId))
    }
  }

  const openDeleteDialog = () => {
    setDeleteSlugInput('')
    setVerifiedDeleteSlug('')
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setDeleteSlugInput('')
    setVerifiedDeleteSlug('')
  }

  const handleVerifyDeleteSlug = () => {
    if (!selectedTenant) return

    const typedSlug = deleteSlugInput.trim().toLowerCase()
    if (typedSlug !== selectedTenant.slug) {
      setVerifiedDeleteSlug('')
      setError('Entered slug does not match this tenant.')
      return
    }

    setError('')
    setVerifiedDeleteSlug(selectedTenant.slug)
    refreshSuccess(`Slug ${selectedTenant.slug} verified. You can now delete this tenant.`)
  }

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return

    const typedSlug = deleteSlugInput.trim().toLowerCase()
    if (typedSlug !== selectedTenant.slug || verifiedDeleteSlug !== selectedTenant.slug) {
      setError('Please verify the tenant slug before deletion.')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      await tenantAdminApi.delete(selectedTenant._id, typedSlug)
      await loadTenants(search)
      closeDeleteDialog()
      setSelectedTenant(null)
      navigateTo('/')
      refreshSuccess(`Tenant ${selectedTenant.slug} deleted from central and tenant databases`)
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response
        setError(response?.data?.message || 'Failed to delete tenant')
      } else {
        setError('Failed to delete tenant')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedTenantDraft = selectedTenant
    ? tenantDrafts[selectedTenant._id] || {
      name: selectedTenant.name,
      adminEmail: selectedTenant.adminEmail,
    }
    : null

  const filteredCount = tenants.length
  const isDeleteVerified = Boolean(selectedTenant && verifiedDeleteSlug === selectedTenant.slug)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            {isTenantDetailPage ? 'Tenant Details' : 'Platform Dashboard'}
          </h1>
          {isTenantDetailPage && selectedTenant && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Manage tenant <strong style={{ color: 'var(--text-primary)' }}>{selectedTenant.slug}</strong>
            </p>
          )}
          {!isTenantDetailPage && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Signed in as {admin.email}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {error && <span className="error-text" style={{ margin: 0, alignSelf: 'center' }}>{error}</span>}
          {success && <span className="success-text" style={{ margin: 0, alignSelf: 'center' }}>{success}</span>}
          {!isTenantDetailPage && (
            <button
              className="primary"
              onClick={() => setIsCreateDialogOpen(true)}
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              <span style={{ marginRight: 8, fontSize: 18 }}>+</span>
              Create New Tenant
            </button>
          )}
        </div>
      </div>

      <Dialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Create New Tenant"
      >
        <form onSubmit={handleCreateTenant} className="grid" style={{ gap: 20 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Slug</label>
              <input
                placeholder="xyz"
                value={newTenant.slug}
                onChange={(e) => setNewTenant((prev) => ({ ...prev, slug: e.target.value }))}
                required
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Display Name</label>
              <input
                placeholder="Acme Corp"
                value={newTenant.name}
                onChange={(e) => setNewTenant((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Admin Email</label>
            <input
              type="email"
              placeholder="admin@tenant.com"
              value={newTenant.adminEmail}
              onChange={(e) => setNewTenant((prev) => ({ ...prev, adminEmail: e.target.value }))}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Custom Password (optional)</label>
            <input
              type="text"
              placeholder="Leave blank for auto-gen"
              value={newTenant.adminPassword}
              onChange={(e) => setNewTenant((prev) => ({ ...prev, adminPassword: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        title={`Delete Tenant ${selectedTenant?.slug || ''}`}
      >
        {selectedTenant && (
          <div className="grid" style={{ gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This action is permanent. It will remove this tenant from the central platform database and also drop
              tenant database <strong style={{ color: 'var(--text-primary)' }}>{selectedTenant.dbName}</strong>.
            </p>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Type tenant slug to confirm</label>
              <input
                placeholder={selectedTenant.slug}
                value={deleteSlugInput}
                onChange={(e) => {
                  setDeleteSlugInput(e.target.value)
                  setVerifiedDeleteSlug('')
                }}
              />
            </div>

            <button
              type="button"
              className="secondary"
              onClick={handleVerifyDeleteSlug}
              disabled={isDeleting}
            >
              Verify Slug
            </button>

            {isDeleteVerified && (
              <div
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.875rem',
                  color: 'var(--success)',
                }}
              >
                Slug verified. Click "Delete Tenant" to permanently delete this tenant.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="ghost"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTenant}
                disabled={isDeleting || !isDeleteVerified}
                style={{
                  flex: 2,
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: 'var(--danger)',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Tenant'}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {!isTenantDetailPage && (
        <>
          <section className="card" style={{ marginBottom: 40 }}>
            <h2 className="card-title">Global Search</h2>
            <div className="grid" style={{ gap: 16 }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Search Filter</label>
                <input
                  placeholder="Filter by slug, name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => loadTenants(search)}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Searching...' : 'Apply Filter'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSearch('')
                    loadTenants('')
                  }}
                >
                  Clear
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Showing {filteredCount} tenant records
              </p>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="card-title" style={{ margin: 0 }}>Tenants Management</h2>
            </div>

            <div className="tenant-list">
              {tenants.map((tenant) => (
                <div
                  key={tenant._id}
                  className="tenant-item tenant-item-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo(buildTenantPath(tenant._id))}
                  onKeyDown={(event) => handleTenantRowKeyDown(event, tenant._id)}
                >
                  <div>
                    <div className="tenant-slug">{tenant.slug}</div>
                    <div className="tenant-db">{tenant.dbName}</div>
                  </div>
                  <div>{tenant.name}</div>
                  <div>{tenant.adminEmail}</div>
                  <div>
                    <span className={`status-badge ${tenant.status}`}>{tenant.status}</span>
                  </div>
                  <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Open ▸
                  </div>
                </div>
              ))}
              {tenants.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No tenants found matching your search.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {isTenantDetailPage && (
        <section>
          <button
            type="button"
            className="ghost"
            onClick={() => navigateTo('/')}
            style={{ marginBottom: 20 }}
          >
            ← Back to tenants
          </button>

          {detailLoading && !selectedTenant && (
            <div className="card" style={{ color: 'var(--text-secondary)' }}>
              Loading tenant details...
            </div>
          )}

          {!detailLoading && !selectedTenant && (
            <div className="card" style={{ color: 'var(--text-secondary)' }}>
              Tenant not found.
            </div>
          )}

          {selectedTenant && selectedTenantDraft && (
            <div className="grid" style={{ gap: 24 }}>
              <div className="card">
                <h2 className="card-title">Tenant Profile</h2>
                <div className="tenant-meta-grid" style={{ marginBottom: 24 }}>
                  <div>
                    <div className="input-label" style={{ marginBottom: 6 }}>Slug</div>
                    <div>{selectedTenant.slug}</div>
                  </div>
                  <div>
                    <div className="input-label" style={{ marginBottom: 6 }}>Database</div>
                    <div>{selectedTenant.dbName}</div>
                  </div>
                  <div>
                    <div className="input-label" style={{ marginBottom: 6 }}>Status</div>
                    <span className={`status-badge ${selectedTenant.status}`}>{selectedTenant.status}</span>
                  </div>
                  <div>
                    <div className="input-label" style={{ marginBottom: 6 }}>Created</div>
                    <div>{new Date(selectedTenant.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid" style={{ gap: 16 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Display Name</label>
                    <input
                      value={selectedTenantDraft.name}
                      onChange={(e) => setTenantDrafts((prev) => ({
                        ...prev,
                        [selectedTenant._id]: { ...selectedTenantDraft, name: e.target.value },
                      }))}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Admin Email</label>
                    <input
                      type="email"
                      value={selectedTenantDraft.adminEmail}
                      onChange={(e) => setTenantDrafts((prev) => ({
                        ...prev,
                        [selectedTenant._id]: { ...selectedTenantDraft, adminEmail: e.target.value },
                      }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleTenantUpdate(selectedTenant._id)}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleStatusChange(selectedTenant)}
                      disabled={loading}
                      style={{
                        color: selectedTenant.status === 'active' ? 'var(--danger)' : 'var(--success)',
                        borderColor: selectedTenant.status === 'active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      {selectedTenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                <h2 className="card-title" style={{ color: 'var(--danger)' }}>Danger Zone</h2>
                <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--text-secondary)' }}>
                  Delete this tenant from central records and permanently drop tenant database.
                </p>
                <button
                  type="button"
                  className="ghost"
                  onClick={openDeleteDialog}
                  style={{
                    color: 'var(--danger)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                  }}
                >
                  Delete Tenant
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}
