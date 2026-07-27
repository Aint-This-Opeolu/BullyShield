import { Link } from 'react-router-dom';
import { FilePlus2, Search, BookOpenText, ArrowRight } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../../components/ui';

export default function StudentOverview() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-slate-900">Hi {user?.fullName?.split(' ')[0]},</h1>
      <p className="mt-1 text-slate-500">What would you like to do today?</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card className="flex flex-col p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FilePlus2 className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <h2 className="font-semibold text-slate-900">Report an incident</h2>
          <p className="mt-1.5 flex-1 text-sm text-slate-500">
            Submit a new report, anonymously or under your name.
          </p>
          <Button as={Link} to="/report" variant="secondary" className="mt-4">
            Get started <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="flex flex-col p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Search className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <h2 className="font-semibold text-slate-900">Track a report</h2>
          <p className="mt-1.5 flex-1 text-sm text-slate-500">
            Check the status of a report with your tracking code.
          </p>
          <Button as={Link} to="/track" variant="secondary" className="mt-4">
            Check status <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="flex flex-col p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BookOpenText className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <h2 className="font-semibold text-slate-900">Guidelines</h2>
          <p className="mt-1.5 flex-1 text-sm text-slate-500">
            Learn what counts as bullying and what to expect from the process.
          </p>
          <Button as={Link} to="/guidelines" variant="secondary" className="mt-4">
            Read guidelines <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      <Card className="mt-8 p-6">
        <p className="text-sm text-slate-500">
          Tracking codes are not tied to your account — save the code shown after each submission
          somewhere safe, since it is the only way to look up an anonymous report.
        </p>
      </Card>
    </AppLayout>
  );
}
