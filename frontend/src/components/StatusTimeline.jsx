import { Check, Clock, Search, FolderSearch } from 'lucide-react';

const STEPS = [
  { key: 'PENDING', label: 'Received', icon: Clock },
  { key: 'UNDER_INVESTIGATION', label: 'Under investigation', icon: FolderSearch },
  { key: 'RESOLVED', label: 'Resolved', icon: Check },
];

export default function StatusTimeline({ status }) {
  // ESCALATED renders as its own state, past "Under investigation"
  const order = ['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED'];
  const effectiveIndex = status === 'ESCALATED' ? 1 : order.indexOf(status);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = i < effectiveIndex || (i === effectiveIndex && status === 'RESOLVED');
          const active = i === effectiveIndex && status !== 'RESOLVED';
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ring-4 transition ${
                    done
                      ? 'bg-emerald-600 text-white ring-emerald-100'
                      : active
                      ? 'bg-brand-600 text-white ring-brand-100'
                      : 'bg-slate-100 text-slate-400 ring-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span
                  className={`text-xs font-medium ${
                    done || active ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 rounded transition ${
                    i < effectiveIndex ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {status === 'ESCALATED' && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 ring-1 ring-inset ring-red-200">
          This case has been escalated for priority handling.
        </p>
      )}
    </div>
  );
}
