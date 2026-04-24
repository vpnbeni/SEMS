import { headers } from "next/headers";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileBadge2,
  FileCheck2,
  FileStack,
  GraduationCap,
  Landmark,
  LayoutGrid,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users2,
  Wallet,
} from "lucide-react";

function getCntrOrigin(host: string): string {
  if (host.startsWith("stage.")) return "https://stagecntr.capabble.cloud";
  return "https://cntr.capabble.cloud";
}

type ModuleCard = {
  code: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  accent: string;
};

const modules: ModuleCard[] = [
  {
    code: "CNTR",
    title: "Centre Control",
    description: "Centralized command hub for complete exam centre management.",
    bullets: [
      "Monitor all activities in real-time",
      "Control roles, permissions, and workflows",
      "Get live alerts and status updates",
    ],
    icon: Building2,
    accent: "bg-sky-100 text-sky-700",
  },
  {
    code: "TMTBL",
    title: "Timetable",
    description: "Plan and manage exam schedules efficiently.",
    bullets: [
      "Create and edit exam schedules",
      "Avoid clashes with smart structuring",
      "Auto-share schedules with stakeholders",
    ],
    icon: CalendarDays,
    accent: "bg-violet-100 text-violet-700",
  },
  {
    code: "EXMCL",
    title: "Exam Cell",
    description: "Manage all exam-related operations in one place.",
    bullets: [
      "Configure exam settings and rules",
      "Handle confidential workflows securely",
      "Coordinate pre and post exam activities",
    ],
    icon: ClipboardList,
    accent: "bg-amber-100 text-amber-700",
  },
  {
    code: "CPITL",
    title: "Capital / Finance",
    description: "Track and manage financial aspects of exams.",
    bullets: [
      "Budget allocation and tracking",
      "Expense monitoring and reports",
      "Transparent financial overview",
    ],
    icon: Wallet,
    accent: "bg-blue-100 text-blue-700",
  },
  {
    code: "STTOK",
    title: "Stock",
    description: "Manage inventory and exam materials seamlessly.",
    bullets: [
      "Track answer sheets and materials",
      "Monitor stock levels in real-time",
      "Reduce shortages and overstock",
    ],
    icon: FileStack,
    accent: "bg-purple-100 text-purple-700",
  },
  {
    code: "TRNST",
    title: "Transport",
    description: "Ensure smooth transport and logistics planning.",
    bullets: [
      "Plan routes and vehicle allocation",
      "Track movement of materials and staff",
      "Avoid delays with optimized scheduling",
    ],
    icon: Landmark,
    accent: "bg-cyan-100 text-cyan-700",
  },
  {
    code: "ACTVT",
    title: "Activities",
    description: "Handle all co-curricular and support activities.",
    bullets: [
      "Manage events and extra tasks",
      "Assign responsibilities easily",
      "Track completion status",
    ],
    icon: Sparkles,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    code: "ACDMC",
    title: "Academic",
    description: "Oversee academic planning and execution.",
    bullets: [
      "Manage subjects and exam patterns",
      "Maintain academic records",
      "Align with institutional guidelines",
    ],
    icon: GraduationCap,
    accent: "bg-orange-100 text-orange-700",
  },
  {
    code: "ATTND",
    title: "Attendance",
    description: "Track attendance of staff and students accurately.",
    bullets: [
      "Mark and monitor attendance",
      "Generate attendance reports",
      "Identify shortages instantly",
    ],
    icon: ClipboardCheck,
    accent: "bg-rose-100 text-rose-700",
  },
  {
    code: "LBRY",
    title: "Library",
    description: "Organize and manage library resources.",
    bullets: [
      "Track book inventory",
      "Issue and return management",
      "Maintain digital records",
    ],
    icon: BookOpenText,
    accent: "bg-teal-100 text-teal-700",
  },
  {
    code: "LABBS",
    title: "Laboratories",
    description: "Manage lab resources and practical exams.",
    bullets: [
      "Schedule lab sessions",
      "Track equipment usage",
      "Ensure safety and readiness",
    ],
    icon: LayoutGrid,
    accent: "bg-indigo-100 text-indigo-700",
  },
  {
    code: "STAAF",
    title: "Staff",
    description: "Efficiently manage staff roles and duties.",
    bullets: [
      "Assign duties and invigilation",
      "Maintain staff profiles",
      "Monitor performance and availability",
    ],
    icon: Users2,
    accent: "bg-lime-100 text-lime-700",
  },
  {
    code: "ALMNY",
    title: "Alumni",
    description: "Stay connected with former students.",
    bullets: [
      "Maintain alumni database",
      "Enable engagement and networking",
      "Track contributions and activities",
    ],
    icon: ExternalLink,
    accent: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    code: "STDNT",
    title: "Students",
    description: "Central student information management.",
    bullets: [
      "Maintain student profiles",
      "Track academic and exam data",
      "Enable easy communication",
    ],
    icon: UserRound,
    accent: "bg-slate-100 text-slate-700",
  },
  {
    code: "CNTCT",
    title: "Contact",
    description: "Simplify communication across stakeholders.",
    bullets: [
      "Manage contact directories",
      "Enable quick communication",
      "Centralize all contact information",
    ],
    icon: FileCheck2,
    accent: "bg-green-100 text-green-700",
  },
  {
    code: "FDBCK",
    title: "Feedback",
    description: "Collect and analyze feedback effectively.",
    bullets: [
      "Gather feedback from users",
      "Analyze insights for improvement",
      "Improve processes continuously",
    ],
    icon: FileBadge2,
    accent: "bg-yellow-100 text-yellow-700",
  },
];

const platformHighlights = [
  "Multi-tenant architecture for institutions and groups",
  "Connected planning, execution, tracking, and compliance",
  "Real modules already used across exam-centre workflows",
];

const valuePoints = [
  "One brand surface for Capabble with CNTR acting as the central exam operations hub.",
  "A clean, dashboard-ready view of all 16 platform modules from planning to communication.",
  "Each module now has a short heading, brief, and three crisp points ready for landing-page cards.",
];

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const cntrOrigin = getCntrOrigin(host);
  const loginUrl = `${cntrOrigin}/#/login`;
  const signupUrl = `${cntrOrigin}/#/signup`;

  return (
    <main className="landing-shell relative min-h-screen overflow-hidden">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-grid" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-8 sm:px-10 sm:pt-10">
        <header className="frost-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">capabble.cloud</p>
              <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Capabble</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href={loginUrl} className="cta-secondary" title="Login to Cntr - Exam Centre Control">
              <LogIn className="h-4 w-4" />
              Login to Cntr
            </a>
            <a href={signupUrl} className="cta-primary" title="Register your centre on Cntr">
              <ArrowRight className="h-4 w-4" />
              Register Centre
            </a>
          </div>
        </header>

        <section className="pt-16 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl space-y-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Main Capabble Landing
              </p>

              <div className="space-y-5">
                <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl dark:text-white">
                  A unified cloud workspace for{" "}
                  <span className="bg-gradient-to-r from-sky-600 via-cyan-500 to-orange-500 bg-clip-text text-transparent">
                    16 connected exam modules
                  </span>
                  .
                </h1>

                <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
                  Capabble is the parent platform for connected institutional operations. CNTR anchors exam-centre
                  control while the wider suite extends into timetable, finance, stock, transport, academics, staff,
                  students, communication, and feedback workflows.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                {platformHighlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {highlight}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <a href="#modules" className="cta-primary cta-lg" title="See Capabble modules">
                  Explore 16 Modules
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href={loginUrl} className="cta-secondary cta-lg" title="Open Cntr - Exam Centre Control">
                  Open Cntr
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="frost-card relative overflow-hidden rounded-[2rem] p-5 shadow-2xl shadow-sky-500/10">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-sky-500/12 via-cyan-400/10 to-orange-400/12" />

                <div className="relative rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 shadow-lg dark:border-slate-700/60 dark:bg-slate-950/70">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Core Control Layer</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">CNTR</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Centre control inside the broader Capabble suite.</p>
                    </div>
                    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/70 dark:text-slate-500">Modules</p>
                      <p className="mt-1 text-3xl font-black">16</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {modules.slice(0, 4).map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700/60 dark:bg-slate-900/70"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.accent}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                {item.code}
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300/80 bg-gradient-to-r from-sky-50 to-orange-50 p-4 dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workflow Coverage</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          A modular platform where each workspace supports a focused operational responsibility.
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white">
                        Tenant-ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-5 sm:mt-20 md:grid-cols-3">
          {valuePoints.map((point) => (
            <article key={point} className="frost-card rounded-2xl p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <p className="mt-5 text-base leading-relaxed text-slate-700 dark:text-slate-200">{point}</p>
            </article>
          ))}
        </section>

        <section id="modules" className="mt-16 sm:mt-20">
          <div className="frost-card rounded-[2rem] p-6 sm:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Modules
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                16 connected modules across the Capabble platform
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                The content is now structured for marketing cards: short code, clear heading, one-line brief,
                and three crisp operational points for each workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <article
                    key={module.title}
                    className="group rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${module.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {module.code}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{module.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{module.description}</p>

                    <ul className="mt-4 space-y-2">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="frost-card rounded-[2rem] p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Why This Layout
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                The parent brand should present the full suite, not only the exam dashboard.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                This keeps the same clean landing-page rhythm while making the broader Capabble module ecosystem visible
                at first glance. CNTR remains the anchor, but the page now sells the full product surface.
              </p>
            </div>

            <div className="frost-card rounded-[2rem] p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Platform Flow
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step 01</p>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Discover the platform</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Show the company brand, the module system, and the control-layer entry point in one scan.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step 02</p>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Enter the core workspace</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Existing institutions can log in through CNTR while new centres can begin onboarding from the same page.
                  </p>
                </article>
                <article className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step 03</p>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Expand across modules</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Teams can move from exam operations into timetable, academics, transport, finance, staff, and communication workflows.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="frost-card rounded-[2rem] border-sky-200/60 bg-gradient-to-r from-sky-600 to-cyan-600 p-8 text-white shadow-2xl shadow-cyan-500/20 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Launch From Capabble</p>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  Open the flagship workspace or onboard your next centre.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                  The main site now speaks for the platform while still funneling users directly into Cntr for login and signup.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={loginUrl}
                  className="rounded-full bg-white px-6 py-3 text-sm font-bold text-sky-700 transition hover:-translate-y-0.5 hover:bg-slate-100"
                  title="Login to Cntr - Exam Centre Control"
                >
                  Login to Cntr
                </a>
                <a
                  href={signupUrl}
                  className="rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                  title="Register your centre on Cntr"
                >
                  Register Centre
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
