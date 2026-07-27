const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  UNDER_INVESTIGATION: 'bg-blue-50 text-blue-800 ring-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  ESCALATED: 'bg-red-50 text-red-800 ring-red-200',
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  UNDER_INVESTIGATION: 'Under investigation',
  RESOLVED: 'Resolved',
  ESCALATED: 'Escalated',
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const TYPE_LABELS = {
  PHYSICAL: 'Physical',
  VERBAL: 'Verbal',
  PSYCHOLOGICAL: 'Psychological',
  RELATIONAL: 'Relational / Social',
  SEXUAL: 'Sexual harassment',
};

export function BullyingTypeBadge({ type }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
      {TYPE_LABELS[type] || type}
    </span>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({ as: As = 'button', variant = 'primary', className = '', children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
    secondary:
      'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-brand-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
  };
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      {Icon && (
        <div className="rounded-full bg-white p-3 ring-1 ring-slate-200">
          <Icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
