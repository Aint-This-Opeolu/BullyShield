import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, MessageCircleWarning, HeartHandshake } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { Card, Button } from '../components/ui';

const TYPES = [
  { label: 'Physical', desc: 'Hitting, shoving, tripping, or any unwanted physical contact meant to hurt or intimidate.' },
  { label: 'Verbal', desc: 'Name-calling, insults, threats, or repeated teasing meant to demean.' },
  { label: 'Psychological', desc: 'Intimidation, manipulation, or behaviour meant to control or frighten someone.' },
  { label: 'Relational / Social', desc: 'Deliberate exclusion, spreading rumours, or damaging someone\u2019s relationships.' },
  { label: 'Sexual harassment', desc: 'Unwanted sexual comments, advances, or contact.' },
];

export default function Guidelines() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold text-slate-900">Reporting guidelines</h1>
        <p className="mt-3 text-slate-600">
          A short guide to what counts as bullying, what to expect when you report, and how to
          look after yourself while it's being handled.
        </p>

        <Card className="mt-8 p-6">
          <h2 className="font-semibold text-slate-900">Recognising bullying</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <div key={t.label} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                <p className="mt-1 text-sm text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <h2 className="font-semibold text-slate-900">Anonymous or named — your choice</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                You can report without giving your name at all. If you report anonymously, we
                won't ask for or store anything that identifies you. If you report by name, only
                assigned staff can see who you are, and you'll need to be logged in.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <MessageCircleWarning className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <h2 className="font-semibold text-slate-900">What makes a report easier to act on</h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-500">
                <li>Where and roughly when it happened</li>
                <li>What was said or done, as specifically as you can remember</li>
                <li>Any evidence you have — screenshots, photos, or messages</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-semibold text-slate-900">If you're in immediate danger</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                This platform is for reporting incidents so they can be investigated — it is not
                monitored around the clock. If you or someone else is in immediate danger, contact
                campus security or local emergency services right away.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-6 flex items-center justify-between gap-4 p-6">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <h2 className="font-semibold text-slate-900">Ready to report?</h2>
              <p className="mt-1.5 text-sm text-slate-500">It takes about five minutes.</p>
            </div>
          </div>
          <Button as={Link} to="/report" className="shrink-0">
            Report an incident
          </Button>
        </Card>
      </div>
    </PublicLayout>
  );
}
