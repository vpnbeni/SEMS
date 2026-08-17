import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CentreRecordsUtilityPage from '../components/centre-records/CentreRecordsUtilityPage'
import './SchoolHub.css'

type FormatTile = {
  id: string
  name: string
  description: string
  href?: string
  icon: React.ReactNode
}

const FORMAT_TILES: FormatTile[] = [
  {
    id: 'award-list',
    name: 'Award List',
    description: 'Design the award list layout used when generating PDFs.',
    href: '/exmcl/performas/award-list',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21h7.5M12 17.25V21m-5.25-9A5.25 5.25 0 0112 6.75 5.25 5.25 0 0117.25 12 5.25 5.25 0 0112 17.25 5.25 5.25 0 016.75 12z" />
      </svg>
    ),
  },
  {
    id: 'admit-card',
    name: 'Admit Card',
    description: 'Design the admit card layout used when generating student exam cards.',
    href: '/exmcl/performas/admit-card',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
  },
  {
    id: 'datesheet',
    name: 'Datesheet',
    description: 'Create and print class-wise examination datesheets.',
    href: '/exmcl/datesheets',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    id: 'seating-plan',
    name: 'Seating Plan',
    description: 'Generate seating plan PDFs for exam rooms and halls.',
    href: '/exmcl/seatingplan',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'duties',
    name: 'Duties',
    description: 'Assign invigilators and print duty records for exam days.',
    href: '/exmcl/duties',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'rechecking',
    name: 'Rechecking',
    description: 'Prepare rechecking and re-evaluation request formats.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    id: 'report-card',
    name: 'Report Card',
    description: 'Design the report card layout used when generating PDFs.',
    href: '/exmcl/performas/report-card',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: 'consolidated-sheet',
    name: 'Consolidated Sheet',
    description: 'Compile class-wise consolidated marks sheets for records.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="hub-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125h-1.5c-.621 0-1.125-.504-1.125-1.125m3.75 0v-1.5c0-.621-.504-1.125-1.125-1.125M4.5 4.5h15A1.5 1.5 0 0121 6v.75H3V6A1.5 1.5 0 014.5 4.5z" />
      </svg>
    ),
  },
]

const ExmclFormats: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="px-8 pb-8 pt-3 max-w-[1600px] mx-auto min-h-screen">
      <div className="hub-cards-grid">
        {FORMAT_TILES.map((tile) => (
          <div
            key={tile.id}
            role="button"
            tabIndex={0}
            className={`hub-card hub-card--${tile.id}`}
            onClick={() => {
              if (tile.href) navigate(tile.href)
            }}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && tile.href) {
                event.preventDefault()
                navigate(tile.href)
              }
            }}
          >
            <div className="hub-card-arrow">
              <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
            <div className="hub-card-content">
              {tile.icon}
              <h3 className="hub-card-name">{tile.name}</h3>
              <p className="hub-card-desc">{tile.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const Performas: React.FC = () => {
  const location = useLocation()
  const isExmcl = location.pathname.includes('/exmcl/performas') || location.hash.includes('/exmcl/performas')

  if (isExmcl) {
    return <ExmclFormats />
  }

  return (
    <CentreRecordsUtilityPage
      title="Performa's"
      description="Prepare commonly needed centre documents such as relieving letters and answer sheet submission letters without rebuilding the same content manually every exam day."
      summaryLabel="Letter generation and centre document drafting"
      summaryValue="Docs"
      accentClasses="bg-[linear-gradient(135deg,#eefaf4_0%,#f9fcff_52%,#fff7ed_100%)]"
      overview={[
        'Generate relieving letters with centre and duty context already in place.',
        'Prepare answer sheet submission letters with standard wording and date-wise details.',
        'Reduce repeat document drafting during busy exam-day operations.',
      ]}
      workflows={[
        {
          title: 'Relieving Letter Drafting',
          description: 'Generate relieving letters for functionaries or staff once duty completion details are available.',
        },
        {
          title: 'Answer Sheet Submission Letter',
          description: 'Prepare the submission letter for answer sheets with the relevant centre details and exam-day context.',
        },
        {
          title: 'Reusable Templates',
          description: 'Keep a standard set of centre-level performas ready so documents stay consistent across all exam days.',
        },
        {
          title: 'Print and Archive Flow',
          description: 'Use one place to review, print, and later archive the generated letters for record keeping.',
        },
      ]}
      outputs={[
        {
          title: 'Relieving letter',
          description: 'A ready-to-print letter for staff or functionaries after duty completion.',
        },
        {
          title: 'Answer sheet submission letter',
          description: 'A formal letter to accompany submission of answer sheets and related material.',
        },
        {
          title: 'Template-driven performas',
          description: 'A base library of standard centre letters that can be reused with minimal edits.',
        },
      ]}
    />
  )
}

export default Performas
