import { Link } from 'react-router-dom';
import { ShieldCheck, FilePlus2, Search, Lock, Users2, ArrowRight } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { Button, Card } from '../components/ui';

export default function Home() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Confidential &amp; encrypted
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Speak up. We'll take it from there.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              BullyShield lets any student report bullying, on or off campus, in minutes —
              anonymously or by name. Every report reaches a real counsellor, and you can check
              its status any time with your tracking code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button as={Link} to="/report" className="text-base">
                Report an incident <ArrowRight className="h-4 w-4" />
              </Button>
              <Button as={Link} to="/track" variant="secondary" className="text-base">
                Track a report
              </Button>
            </div>
          </div>

          <Card className="p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              What happens after you submit
            </p>
            <ol className="mt-5 space-y-5">
              {[
                ['Your report is encrypted', 'Details are stored securely and only visible to authorised staff.'],
                ['It reaches the right team', 'Based on what happened, it is routed to a counsellor or the disciplinary team.'],
                ['You get a tracking code', 'Use it anytime to check progress — no login required.'],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              [FilePlus2, 'Report your way', 'Choose to stay anonymous, or report by name and get personal updates.'],
              [Lock, 'Protected by design', 'AES-256 encryption, role-based access, and a full audit trail on every case.'],
              [Users2, 'Real people, real follow-up', 'Trained counsellors and administrators review and act on every report.'],
            ].map(([Icon, title, desc]) => (
              <div key={title}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Card className="flex flex-col items-center gap-4 px-8 py-12 text-center">
          <Search className="h-6 w-6 text-brand-600" />
          <h2 className="font-display text-2xl font-bold text-slate-900">Already reported something?</h2>
          <p className="max-w-md text-sm text-slate-500">
            Enter your tracking code to see where your report stands — no account needed.
          </p>
          <Button as={Link} to="/track" variant="secondary">
            Track a report
          </Button>
        </Card>
      </section>
    </PublicLayout>
  );
}
