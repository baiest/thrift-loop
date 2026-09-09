import { Link, useNavigate } from 'react-router-dom';
import illustration from '../assets/clothing-illustration.svg';
import { LoginForm } from '../components/organisms/login-form.js';

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <img src={illustration} alt="" className="mb-6 w-full" />
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-600">Log in to keep buying and selling.</p>

      <LoginForm
        onSuccess={() => {
          void navigate('/');
        }}
      />

      <p className="mt-6 text-center text-sm text-gray-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand-700">
          Create an account
        </Link>
      </p>
    </main>
  );
}
