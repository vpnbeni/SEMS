import React from 'react'

interface UtilityCardItem {
  title: string
  description: string
}

interface UtilityChecklistItem {
  title: string
  description: string
}

interface CentreRecordsUtilityPageProps {
  title: string
  description: string
  summaryLabel: string
  summaryValue: string
  accentClasses: string
  overview: string[]
  workflows: UtilityCardItem[]
  outputs: UtilityChecklistItem[]
}

const CentreRecordsUtilityPage: React.FC<CentreRecordsUtilityPageProps> = ({
  title,
  description,
  summaryLabel,
  summaryValue,
  accentClasses,
  overview,
  workflows,
  outputs,
}) => {
  return (
    <div className="px-8 pb-8 pt-3 max-w-[1600px] mx-auto">
      <div className={`overflow-hidden rounded-[28px] border border-slate-200 ${accentClasses}`}>
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.5fr_0.9fr] lg:px-8">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Centre Records Workspace
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {overview.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Primary Output</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{summaryValue}</p>
            <p className="mt-2 text-sm text-slate-600">{summaryLabel}</p>
            <div className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 text-sm leading-6 text-slate-100">
              This page is now wired into the centre records flow and ready for feature-specific data and document generation.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflows</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">What users will do here</h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {workflows.length} flows
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {workflows.map((workflow) => (
              <article
                key={workflow.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h4 className="text-base font-semibold text-slate-900">{workflow.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Documents</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Expected outputs</h3>

          <div className="mt-5 space-y-3">
            {outputs.map((output) => (
              <div
                key={output.title}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{output.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{output.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default CentreRecordsUtilityPage
