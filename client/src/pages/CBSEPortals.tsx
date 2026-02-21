import React from 'react'

interface PortalItem {
  id: string
  name: string
  description: string
  url: string
  icon: React.ReactNode
  gradient: string
  shadowColor: string
}

const portals: PortalItem[] = [
  {
    id: 'cbse-main',
    name: 'CBSE Main Website',
    description: 'Official Central Board of Secondary Education website',
    url: 'https://www.cbse.gov.in/',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadowColor: 'rgba(102, 126, 234, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.467.732-3.558" />
      </svg>
    ),
  },
  {
    id: 'cbse-academics',
    name: 'CBSE Academics',
    description: 'Academic circulars, curriculum, and exam resources',
    url: 'https://cbseacademic.nic.in/',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    shadowColor: 'rgba(245, 87, 108, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84 51.39 51.39 0 00-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    id: 'pariksha-sangam',
    name: 'Pariksha Sangam',
    description: 'Integrated examination portal for schools and students',
    url: 'https://parikshasangam.cbse.gov.in/',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    shadowColor: 'rgba(79, 172, 254, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    id: 'cbse-results',
    name: 'CBSE Results',
    description: 'Official result and exam outcome portal',
    url: 'https://results.cbse.nic.in/',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    shadowColor: 'rgba(67, 233, 123, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'oecms',
    name: 'OECMS',
    description: 'Online Exam Centre Management System for board examinations',
    url: 'https://cbseit.in/cbse/web/oecms/LoginAction.aspx',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    shadowColor: 'rgba(250, 112, 154, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    id: 'loc-admit-card',
    name: 'LOC / Admit Card',
    description: 'List of Candidates submission and admit card download portal',
    url: 'https://cbseit.in/cbse/web/LOC/LoginAction.aspx',
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    shadowColor: 'rgba(161, 140, 209, 0.4)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="portal-card-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
  },
]

const CBSEPortals: React.FC = () => {
  return (
    <div className="px-8 pb-8 pt-3 max-w-[1600px] mx-auto min-h-screen">
      <style>{`
        .portal-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          padding: 8px;
        }

        .portal-card {
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          padding: 28px 24px 24px;
          color: #fff;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          cursor: pointer;
          min-height: 180px;
        }

        .portal-card:hover {
          transform: translateY(-6px) scale(1.02);
        }

        .portal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0) 50%,
            rgba(0, 0, 0, 0.08) 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        .portal-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.18) 0%,
            transparent 60%
          );
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.3s ease;
          opacity: 0.5;
        }

        .portal-card:hover::after {
          opacity: 1;
        }

        .portal-card-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .portal-card-icon {
          width: 40px;
          height: 40px;
          margin-bottom: 16px;
          opacity: 0.9;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
        }

        .portal-card-name {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        .portal-card-desc {
          font-size: 0.875rem;
          font-weight: 400;
          opacity: 0.88;
          line-height: 1.5;
          margin: 0;
          flex: 1;
        }

        .portal-card-arrow {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: background 0.25s ease, transform 0.25s ease;
        }

        .portal-card:hover .portal-card-arrow {
          background: rgba(255, 255, 255, 0.35);
          transform: translate(2px, -2px);
        }

        .portal-card-arrow svg {
          width: 14px;
          height: 14px;
          color: #fff;
        }

        .portal-section-subtitle {
          font-size: 0.9rem;
          color: #718096;
          margin: 0 0 18px 0;
        }

        @media (prefers-color-scheme: dark) {
          .portal-section-subtitle {
            color: #a0aec0;
          }
        }

        /* Dark mode support via class */
        .dark .portal-section-subtitle {
          color: #a0aec0;
        }
      `}</style>

      <p className="portal-section-subtitle">Quick access to official CBSE examination portals and management systems</p>

      <div className="portal-cards-grid">
        {portals.map((portal) => (
          <a
            key={portal.id}
            href={portal.url}
            target="_blank"
            rel="noreferrer"
            className="portal-card"
            style={{
              background: portal.gradient,
              boxShadow: `0 8px 32px ${portal.shadowColor}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                `0 16px 48px ${portal.shadowColor}`
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                `0 8px 32px ${portal.shadowColor}`
            }}
          >
            <div className="portal-card-arrow">
              <svg fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </div>
            <div className="portal-card-content">
              {portal.icon}
              <h3 className="portal-card-name">{portal.name}</h3>
              <p className="portal-card-desc">{portal.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

export default CBSEPortals
