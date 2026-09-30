import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { AppwriteException } from 'appwrite';
import { ChevronRight, CircleAlert, Info, LoaderCircle, WifiOff } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { BrandPanel } from '@/components/auth/BrandPanel';
import { Logo } from '@/components/brand/Logo';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { account } from '@/lib/appwrite';
import { PERSONAS } from '@/lib/personas';
import { sessionHint, sessionQuery } from '@/lib/session';

/** redirect: where to go after signing in. ended: the session ended while the app was open. */
type Search = { redirect?: string; ended?: true };

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>): Search => {
    const target = search.redirect;
    // Only same-site paths, never another origin.
    const redirect =
      typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
        ? target
        : undefined;
    return {
      ...(redirect && { redirect }),
      ...(search.ended === true && { ended: true }),
    };
  },
  beforeLoad: async ({ context, search }) => {
    if (!sessionHint.exists()) return;
    const session = await context.queryClient.fetchQuery(sessionQuery).catch(() => null);
    if (session) throw redirect({ href: search.redirect ?? '/' });
    sessionHint.clear();
  },
  component: SignIn,
});

type Problem = 'credentials' | 'network' | 'rate-limit' | null;

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;

function SignIn() {
  const { redirect: target, ended } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  async function signIn(credentials: { email: string; password: string }) {
    setSubmitting(true);
    setProblem(null);
    try {
      await account.createEmailPasswordSession(credentials);
    } catch (err) {
      // A session from an earlier visit is still active: use it.
      if (!(err instanceof AppwriteException && err.type === 'user_session_already_exists')) {
        setProblem(problemOf(err));
        setSubmitting(false);
        return;
      }
    }
    sessionHint.set();
    queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
    await navigate({ href: target ?? '/' });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!submitting) void signIn({ email: email.trim(), password });
  }

  function choosePersona(personaEmail: string) {
    setEmail(personaEmail);
    setProblem(null);
    if (DEMO_PASSWORD) {
      setPassword(DEMO_PASSWORD);
      void signIn({ email: personaEmail, password: DEMO_PASSWORD });
    } else {
      setPassword('');
      passwordRef.current?.focus();
    }
  }

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)]">
      <BrandPanel />

      <main className="flex flex-col items-center justify-center px-6 py-10 lg:justify-start lg:pt-[max(64px,15dvh)]">
        <div className="w-full max-w-[380px]">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-xl font-semibold tracking-[-0.015em]">Sign in to Cairn</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use the email for your workspace.</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={problem === 'credentials' || undefined}
                className="h-9"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={problem === 'credentials' || undefined}
                className="h-9"
                required
              />
            </div>

            {problem ? (
              <ProblemAlert problem={problem} onRetry={() => signIn({ email, password })} />
            ) : (
              ended && (
                <Alert>
                  <Info />
                  Your session ended, for example after signing out in another tab. Sign in to
                  continue where you left off.
                </Alert>
              )
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting || !email.trim() || !password}
              className="mt-1 w-full"
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              Sign in
            </Button>
          </form>

          <section aria-labelledby="demo-heading" className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 id="demo-heading" className="text-xs font-medium text-muted-foreground">
                Demo workspace
              </h2>
              <span className="text-xs text-subtle">Lumina Analytics</span>
            </div>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {PERSONAS.map((persona) => (
                <li key={persona.email}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => choosePersona(persona.email)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-raised focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 disabled:opacity-60"
                  >
                    <Avatar name={persona.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-5">
                        {persona.name}
                      </span>
                      <span className="block truncate text-xs text-subtle">{persona.title}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {persona.teams.map((team) => (
                        <Badge key={team} tone={team === 'Leadership' ? 'violet' : 'neutral'}>
                          {team}
                        </Badge>
                      ))}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-xs text-subtle">
              Each person belongs to different teams, so each one sees different records, and so
              does Scout.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function ProblemAlert({
  problem,
  onRetry,
}: {
  problem: Exclude<Problem, null>;
  onRetry: () => void;
}) {
  if (problem === 'network') {
    return (
      <Alert tone="danger">
        <WifiOff />
        <span className="flex-1">Couldn't reach the server. Check your connection.</span>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Retry
        </button>
      </Alert>
    );
  }
  return (
    <Alert tone="danger">
      <CircleAlert />
      {problem === 'rate-limit'
        ? 'Too many attempts. Wait a minute, then try again.'
        : 'Email or password is incorrect.'}
    </Alert>
  );
}

function problemOf(err: unknown): Exclude<Problem, null> {
  if (err instanceof AppwriteException) {
    if (err.code === 429) return 'rate-limit';
    if (err.code === 0 || err.code >= 500) return 'network';
    return 'credentials';
  }
  return 'network';
}
