import { Link, useNavigate } from 'react-router-dom';
import illustration from '../assets/clothing-illustration.svg';
import { RegisterForm } from '../components/organisms/register-form.js';

export function RegisterPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <img src={illustration} alt="" className="mb-6 w-full" />
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Create your account</h1>
      <p className="mb-6 text-sm text-gray-600">Buy and sell second-hand clothing in Colombia.</p>

      <RegisterForm
        onSuccess={() => {
          void navigate('/');
        }}
      />

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700">
          Log in
        </Link>
      </p>
    </main>
  );
}
