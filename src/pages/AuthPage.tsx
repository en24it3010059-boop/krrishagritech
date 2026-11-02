import { useState, type FormEvent } from 'react';
import { Sprout, Sun, CloudRain, LineChart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/format';
import { Button, Field, InlineAlert, inputClass } from '@/components/ui';

type AuthMode = 'signin' | 'signup';

const HERO_IMAGE = 'https://images.pexels.com/photos/33786603/pexels-photo-33786603.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const HIGHLIGHTS = [
  { icon: Sun, text: 'Live forecasts for your exact field location' },
  { icon: CloudRain, text: 'Frost, heat and storm alerts before they hit' },
  { icon: LineChart, text: 'Track crops from planting to harvest' },
];

function toAuthMessage(error: unknown): string {
  const message = getErrorMessage(error);
  if (message.includes('Invalid login credentials')) return 'Your email or password is incorrect.';
  if (message.includes('already registered')) return 'An account with this email already exists. Try signing in instead.';
  if (message.includes('Password should be')) return 'Choose a password with at least 6 characters.';
  return message;
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setError('Enter your full name so we can personalise your account.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Your account is ready. Sign in with your new password to continue.');
          setMode('signin');
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(toAuthMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary-950 lg:block">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/60 to-primary-950/20" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
              <Sprout className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold">AgriTech</span>
          </div>
          <div className="max-w-md animate-fade-up">
            <h2 className="font-display text-4xl font-bold leading-tight">Grow smarter, one season at a time.</h2>
            <p className="mt-4 text-base text-primary-100">
              Everything a modern farm needs in one place: weather, crops, and the resources to keep them thriving.
            </p>
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-primary-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-primary-200">Built for farmers who work with the land.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Sprout className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold text-earth-900">AgriTech</span>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight text-earth-900">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-earth-600">
            {isSignUp ? 'Set up your farm in a few minutes.' : 'Sign in to check your fields and orders.'}
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-xl bg-earth-100 p-1" role="tablist">
            {(['signin', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === value ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:text-earth-800'
                }`}
              >
                {value === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            {isSignUp && (
              <Field label="Full name" htmlFor="full-name">
                <input
                  id="full-name"
                  className={inputClass}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  placeholder="Amara Okafor"
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@farm.com"
              />
            </Field>
            <Field label="Password" htmlFor="password" hint={isSignUp ? 'At least 6 characters.' : undefined}>
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
              />
            </Field>

            {error && <InlineAlert tone="error">{error}</InlineAlert>}
            {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

            <Button type="submit" loading={submitting} className="w-full">
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
