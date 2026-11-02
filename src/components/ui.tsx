import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X, type LucideIcon } from 'lucide-react';

export const inputClass =
  'block w-full rounded-lg border border-earth-200 bg-white px-3.5 py-2.5 text-sm text-earth-900 placeholder:text-earth-400 shadow-sm transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:bg-earth-100';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700',
  secondary: 'bg-white text-earth-800 shadow-sm ring-1 ring-inset ring-earth-200 hover:bg-earth-50',
  ghost: 'text-earth-700 hover:bg-earth-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-earth-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-earth-500">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-earth-200/70 ${className}`}>{children}</div>;
}

type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'sky';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-earth-100 text-earth-700',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  sky: 'bg-sky-100 text-sky-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

type AlertTone = 'error' | 'success' | 'info';

const ALERT_STYLES: Record<AlertTone, { box: string; Icon: LucideIcon }> = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', Icon: AlertCircle },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Info },
};

export function InlineAlert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  const { box, Icon } = ALERT_STYLES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm animate-fade-in ${box}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-earth-600">
      <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-earth-300 bg-white/60 px-6 py-12 text-center animate-fade-up">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-earth-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-earth-600">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight text-earth-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-earth-600 sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  size = 'md',
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-earth-950/50 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl animate-fade-up sm:rounded-2xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-earth-100 px-6 py-5">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-semibold text-earth-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-earth-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-earth-500 transition hover:bg-earth-100 hover:text-earth-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
