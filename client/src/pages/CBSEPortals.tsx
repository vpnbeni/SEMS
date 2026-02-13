import React from 'react'

interface PortalItem {
  id: string
  name: string
  description: string
  url: string
}

const portals: PortalItem[] = [
  {
    id: 'cbse-main',
    name: 'CBSE Main Website',
    description: 'Official Central Board of Secondary Education website',
    url: 'https://www.cbse.gov.in/',
  },
  {
    id: 'cbse-academics',
    name: 'CBSE Academics',
    description: 'Academic circulars, curriculum, and exam resources',
    url: 'https://cbseacademic.nic.in/',
  },
  {
    id: 'pariksha-sangam',
    name: 'Pariksha Sangam',
    description: 'Integrated examination portal for schools and students',
    url: 'https://parikshasangam.cbse.gov.in/',
  },
  {
    id: 'cbse-results',
    name: 'CBSE Results',
    description: 'Official result and exam outcome portal',
    url: 'https://results.cbse.nic.in/',
  },
]

const CBSEPortals: React.FC = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CBSE Portals</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open official CBSE examination portals
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {portals.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {portal.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {portal.description}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14h14" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CBSEPortals
