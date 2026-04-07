import React from 'react'
import { Layers3, ShieldCheck } from 'lucide-react'

interface UniversalAuthBrandProps {
  compact?: boolean
  subtitle?: string
}

const UniversalAuthBrand: React.FC<UniversalAuthBrandProps> = ({
  compact = false,
  subtitle = 'Unified module access',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${compact ? '' : 'rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm'}`}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
        <ShieldCheck className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white shadow">
          <Layers3 className="h-3 w-3" />
        </span>
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight text-slate-900">Capabble</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{subtitle}</p>
      </div>
    </div>
  )
}

export default UniversalAuthBrand
