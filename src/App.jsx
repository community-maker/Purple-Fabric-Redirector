import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { listAgents } from './lib/enterpriseGptApi'

function initialsFor(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function parseVersion(version) {
  const parsed = Number.parseFloat(version)
  return Number.isFinite(parsed) ? parsed : 0
}

function namesDiffer(firstName, secondName) {
  return firstName.trim().toLowerCase() !== secondName.trim().toLowerCase()
}

function groupAgentsByAsset(agents) {
  const groups = new Map()

  for (const agent of agents) {
    const existing = groups.get(agent.assetId)
    if (existing) {
      existing.versions.push(agent)
      if (parseVersion(agent.version) > parseVersion(existing.latest.version)) {
        existing.latest = agent
      }
    } else {
      groups.set(agent.assetId, {
        assetId: agent.assetId,
        latest: agent,
        versions: [agent],
      })
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      versions: group.versions.sort((first, second) => parseVersion(second.version) - parseVersion(first.version)),
    }))
    .sort((first, second) => first.latest.name.localeCompare(second.latest.name))
}

function AgentIcon({ agent }) {
  const [failed, setFailed] = useState(false)

  if (!agent.iconDataUrl || failed) {
    return (
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ink-900/10 bg-ink-900 text-[13px] font-semibold text-white shadow-soft">
        {initialsFor(agent.name)}
      </div>
    )
  }

  return (
    <img
      src={agent.iconDataUrl}
      alt=""
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-xl border border-ink-900/10 bg-white object-cover shadow-soft"
    />
  )
}

function AgentCard({ agentGroup, index, openVersionMenuAssetId, setOpenVersionMenuAssetId }) {
  const [selectedAssetVersionId, setSelectedAssetVersionId] = useState(agentGroup.latest.assetVersionId)
  const selectedAgent =
    agentGroup.versions.find((agent) => agent.assetVersionId === selectedAssetVersionId) ?? agentGroup.latest
  const agent = agentGroup.latest
  const type = [agent.category, agent.subCategory].filter(Boolean).join(' / ')
  const selectedNameDiffers = namesDiffer(selectedAgent.name, agent.name)
  const versionMenuOpen = openVersionMenuAssetId === agentGroup.assetId
  const stopCardOpen = (event) => {
    event.stopPropagation()
  }
  const toggleVersionMenu = () => {
    setOpenVersionMenuAssetId((openAssetId) => (openAssetId === agentGroup.assetId ? null : agentGroup.assetId))
  }
  const openSelectedAgent = () => {
    if (versionMenuOpen) {
      setOpenVersionMenuAssetId(null)
      return
    }

    window.open(selectedAgent.chatUrl, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!versionMenuOpen) return undefined

    const closeMenu = () => setOpenVersionMenuAssetId(null)
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [setOpenVersionMenuAssetId, versionMenuOpen])

  return (
    <motion.article
      role="link"
      tabIndex={0}
      title={`Open ${agent.name} v${selectedAgent.version || 'selected'}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.3), ease: [0.22, 1, 0.36, 1] }}
      onClick={openSelectedAgent}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openSelectedAgent()
        }
      }}
      className="group flex min-h-56 cursor-pointer flex-col justify-between rounded-xl border border-ink-900/10 bg-white p-5 shadow-soft transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-pine-600/35 hover:shadow-lift focus:outline-none focus:ring-2 focus:ring-pine-600/30"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <AgentIcon agent={agent} />
          <span className="rounded-full border border-pine-600/15 bg-pine-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pine-700">
            Published
          </span>
        </div>

        <h2 className="mt-5 text-[18px] font-semibold leading-snug text-ink-900">{agent.name}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-600">
          {agent.description || 'Open this Purple Fabric agent in its native chat workspace.'}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div
          className="rounded-xl border border-ink-900/10 bg-gradient-to-b from-white to-ivory-100/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
          onClick={stopCardOpen}
          onMouseDown={stopCardOpen}
          onPointerDown={stopCardOpen}
          onKeyDown={stopCardOpen}
        >
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span
              id={`version-label-${agentGroup.assetId}`}
              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400"
            >
              Version
            </span>
            <span className="rounded-full bg-pine-600/10 px-2 py-0.5 text-[10px] font-semibold text-pine-700">
              {agentGroup.versions.length} version{agentGroup.versions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={versionMenuOpen}
              aria-labelledby={`version-label-${agentGroup.assetId}`}
              onClick={stopCardOpen}
              onMouseDown={stopCardOpen}
              onPointerDown={stopCardOpen}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleVersionMenu()
                }
              }}
              onPointerUp={(event) => {
                event.stopPropagation()
                toggleVersionMenu()
              }}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-ink-900/10 bg-white px-3.5 pr-11 text-left text-sm font-semibold text-ink-900 outline-none shadow-[0_10px_25px_rgba(32,31,27,0.06)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-pine-600/35 hover:bg-white focus:border-pine-600/55 focus:shadow-[0_0_0_4px_rgba(26,111,93,0.12),0_10px_25px_rgba(32,31,27,0.06)]"
            >
              <span className="flex min-w-0 flex-col">
                <span>v{selectedAgent.version || 'unknown'}</span>
                {selectedNameDiffers ? (
                  <span className="mt-0.5 truncate text-[11px] font-medium text-ink-500">
                    {selectedAgent.name}
                  </span>
                ) : null}
              </span>
              {selectedAssetVersionId === agentGroup.versions[0]?.assetVersionId ? (
                <span className="ml-3 mr-1 shrink-0 rounded-full bg-ivory-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Latest
                </span>
              ) : null}
            </button>
            <motion.svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              animate={{ rotate: versionMenuOpen ? 180 : 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>

            <AnimatePresence>
              {versionMenuOpen ? (
                <motion.div
                  role="listbox"
                  aria-labelledby={`version-label-${agentGroup.assetId}`}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-ink-900/10 bg-white p-1.5 shadow-[0_18px_45px_rgba(32,31,27,0.16)]"
                  onClick={stopCardOpen}
                  onMouseDown={stopCardOpen}
                  onPointerDown={stopCardOpen}
                >
                  {agentGroup.versions.map((versionAgent, versionIndex) => {
                    const isSelected = versionAgent.assetVersionId === selectedAssetVersionId
                    const versionNameDiffers = namesDiffer(versionAgent.name, agent.name)

                    return (
                      <button
                        key={versionAgent.assetVersionId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                          isSelected ? 'bg-pine-600 text-white' : 'text-ink-700 hover:bg-ivory-100'
                        }`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedAssetVersionId(versionAgent.assetVersionId)
                          setOpenVersionMenuAssetId(null)
                        }}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <span className="shrink-0">v{versionAgent.version || 'unknown'}</span>
                            {versionNameDiffers ? (
                              <span
                                className={`min-w-0 truncate text-xs font-semibold ${
                                  isSelected ? 'text-white/85' : 'text-ink-500'
                                }`}
                              >
                                {versionAgent.name}
                              </span>
                            ) : null}
                          </span>
                          {!versionNameDiffers ? (
                            <span
                              className={`mt-0.5 truncate text-[11px] ${
                                isSelected ? 'text-white/70' : 'text-ink-400'
                              }`}
                            >
                              {versionAgent.name}
                            </span>
                          ) : null}
                          <span
                            className={`mt-0.5 truncate text-[10px] ${
                              isSelected ? 'text-white/70' : 'text-ink-400'
                            }`}
                          >
                            {versionAgent.assetVersionId}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            isSelected
                              ? 'bg-white/18 text-white'
                              : versionIndex === 0
                                ? 'bg-pine-600/10 text-pine-700'
                                : 'bg-ivory-200 text-ink-500'
                          }`}
                        >
                          {versionIndex === 0 ? 'Latest' : 'Older'}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{type || 'Agent'}</p>
          <p className="mt-1 truncate text-xs text-ink-400">{selectedAgent.assetVersionId}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition-transform duration-200 group-hover:translate-x-1">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 17 17 7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        </div>
      </div>
    </motion.article>
  )
}

function AgentSkeleton() {
  return (
    <div className="min-h-48 rounded-xl border border-ink-900/10 bg-white p-5 shadow-soft">
      <div className="h-12 w-12 animate-pulse rounded-xl bg-ivory-200" />
      <div className="mt-5 h-5 w-3/4 animate-pulse rounded bg-ivory-200" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-ivory-200" />
      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-ivory-200" />
      <div className="mt-8 h-3 w-1/2 animate-pulse rounded bg-ivory-200" />
    </div>
  )
}

export default function App() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [openVersionMenuAssetId, setOpenVersionMenuAssetId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listAgents()
      .then((nextAgents) => {
        if (!cancelled) setAgents(nextAgents)
      })
      .catch((nextError) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Unable to load agents.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const agentGroups = useMemo(() => groupAgentsByAsset(agents), [agents])

  const filteredAgentGroups = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return agentGroups

    return agentGroups.filter((agentGroup) => {
      return agentGroup.versions.some((agent) => [agent.name, agent.description, agent.category, agent.subCategory, agent.version]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)))
    })
  }, [agentGroups, query])

  return (
    <main className="min-h-full bg-[#f7f6f1] text-ink-900">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-ink-900/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-xl bg-ink-900 px-4 shadow-soft">
                <img
                  src="/idcube-logo.svg"
                  alt="IDcube"
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-pine-700">Purple Fabric Workspace</p>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-5xl">
              Choose an agent
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink-600">
              A minimal directory of published agents available in this workspace. Select one to continue in Purple Fabric.
            </p>
          </div>

          <div className="w-full max-w-md">
            <label className="sr-only" htmlFor="agent-search">Search agents</label>
            <div className="flex h-12 items-center gap-3 rounded-xl border border-ink-900/10 bg-white px-4 shadow-soft">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-ink-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
              <input
                id="agent-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search agents"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              />
            </div>
          </div>
        </header>

        <section className="py-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-600">
              {loading ? 'Loading workspace agents...' : `${filteredAgentGroups.length} of ${agentGroups.length} agents`}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!error && loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <AgentSkeleton key={index} />
              ))}
            </div>
          )}

          {!error && !loading && filteredAgentGroups.length === 0 && (
            <div className="rounded-xl border border-ink-900/10 bg-white p-8 text-center shadow-soft">
              <p className="text-base font-semibold text-ink-900">No agents found</p>
              <p className="mt-2 text-sm text-ink-600">Try a different search term or check the Purple Fabric workspace.</p>
            </div>
          )}

          {!error && !loading && filteredAgentGroups.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAgentGroups.map((agentGroup, index) => (
                <AgentCard
                  key={agentGroup.assetId}
                  agentGroup={agentGroup}
                  index={index}
                  openVersionMenuAssetId={openVersionMenuAssetId}
                  setOpenVersionMenuAssetId={setOpenVersionMenuAssetId}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
