import { Link, useNavigate } from 'react-router-dom';
import { AuthHero } from '../components/organisms/auth-hero.js';
import { RegisterForm } from '../components/organisms/register-form.js';

export function RegisterPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <AuthHero
        headline="Join the circle."
        subtext="Buy pieces you'll actually wear, sell the ones you won't."
      />

      <div className="-mt-6 flex flex-1 flex-col rounded-t-3xl bg-surface px-6 pb-6 pt-8">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Create your account</h1>
        <p className="mb-6 text-sm text-ink-soft">Buy and sell second-hand clothing in Colombia.</p>

        <RegisterForm
          onSuccess={() => {
            void navigate('/');
          }}
        />

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
