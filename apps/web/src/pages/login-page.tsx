import { Link, useNavigate } from 'react-router-dom';
import { AuthHero } from '../components/organisms/auth-hero.js';
import { LoginForm } from '../components/organisms/login-form.js';

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <AuthHero
        headline="Your next favorite find is one bid away."
        subtext="Live auctions on secondhand pieces, curated by people, not algorithms."
      />

      <div className="-mt-6 flex flex-1 flex-col rounded-t-3xl bg-surface px-6 pb-6 pt-8">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mb-6 text-sm text-ink-soft">Log in to keep buying and selling.</p>

        <LoginForm
          onSuccess={() => {
            void navigate('/');
          }}
        />

        <p className="mt-6 text-center text-sm text-ink-soft">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-700">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
