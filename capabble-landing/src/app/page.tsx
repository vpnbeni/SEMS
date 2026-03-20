import { headers } from "next/headers";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Workflow,
} from "lucide-react";

function getCntrOrigin(host: string): string {
  if (host.startsWith("stage.")) return "https://stagecntr.capabble.cloud";
  return "https://cntr.capabble.cloud";
}

const workflowSteps = [
  {
    title: "Login and load your centre",
    description: "Tenant-aware login instantly opens the correct workspace for your school or exam centre.",
    icon: LogIn,
  },
  {
    title: "Configure datesheets and rooms",
    description: "Prepare timetables, room allocations, and exam-day controls in one clean dashboard.",
    icon: Workflow,
  },
  {
    title: "Run and track with confidence",
    description: "Monitor attendance, duties, and answer-sheet handling without fragmented tools.",
    icon: CheckCircle2,
  },
];

const benefits = [
  {
    title: "Fast onboarding",
    text: "New institutions can register quickly and start operating the same day.",
    icon: Clock3,
  },
  {
    title: "Built-in trust",
    text: "Structured permissions and secure workflows reduce admin risk during critical exam windows.",
    icon: ShieldCheck,
  },
  {
    title: "Less chaos",
    text: "Everything from setup to dispatch lives in one place, with clear ownership across teams.",
    icon: Sparkles,
  },
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

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10 sm:pt-10">
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
            <a href={loginUrl} className="cta-secondary" title="Login to Cntr – Exam Centre Control">
              <LogIn className="h-4 w-4" />
              Login to Cntr
            </a>
            <a href={signupUrl} className="cta-primary" title="Register your centre on Cntr">
              <UserPlus className="h-4 w-4" />
              Register
            </a>
          </div>
        </header>

        <section className="pt-16 sm:pt-24">
          <div className="max-w-3xl space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Unified Exam Operations
            </p>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              The cleanest way to run exam centres on{" "}
              <span className="bg-gradient-to-r from-sky-600 via-cyan-500 to-orange-500 bg-clip-text text-transparent">
                capabble.cloud
              </span>
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
              One focused platform for planning, execution, and reporting. Log in to continue your workflow, or
              register your institution and get started today.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href={loginUrl} className="cta-primary cta-lg" title="Login to Cntr – Exam Centre Control">
                Login to Cntr Panel
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={signupUrl} className="cta-secondary cta-lg" title="Register your centre on Cntr">
                Create Cntr Account
              </a>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-5 sm:mt-20 md:grid-cols-3">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="frost-card rounded-2xl p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="frost-card rounded-3xl p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Workflow
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 dark:border-slate-700/60 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="frost-card rounded-3xl border-sky-200/60 bg-gradient-to-r from-sky-600 to-cyan-600 p-8 text-white shadow-2xl shadow-cyan-500/20 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">Ready to enter your dashboard?</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                  Existing institutions can login immediately. New schools can register and finish onboarding with the guided setup flow.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a href={loginUrl} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-sky-700 transition hover:-translate-y-0.5 hover:bg-slate-100" title="Login to Cntr – Exam Centre Control">
                  Login to Cntr
                </a>
                <a
                  href={signupUrl}
                  className="rounded-full border border-white/50 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                  title="Register your centre on Cntr"
                >
                  Register on Cntr
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
