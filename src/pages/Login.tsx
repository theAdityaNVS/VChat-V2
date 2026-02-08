import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Chrome } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { AuthLayout } from '../components/layouts/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, error } = useAuth();
  const { executeRecaptcha } = useRecaptcha();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);

      // Execute reCAPTCHA
      await executeRecaptcha('login');

      await signIn(email, password);
      navigate('/');
    } catch {
      // Error is handled by auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    try {
      setIsLoading(true);

      // Execute reCAPTCHA
      await executeRecaptcha('google_signin');

      await signInWithGoogle();
      navigate('/');
    } catch {
      // Error is handled by auth context
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <AuthLayout>
      <Card>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in to VChat</p>
        </div>

        {/* Error Alert */}
        {displayError && <Alert message={displayError} type="error" />}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            icon={Mail}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            icon={Lock}
          />

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-gray-200"></div>
          <span className="text-sm text-gray-500">or</span>
          <div className="h-px flex-1 bg-gray-200"></div>
        </div>

        {/* Google Sign In */}
        <Button
          onClick={handleGoogleSignIn}
          variant="secondary"
          size="lg"
          fullWidth
          disabled={isLoading}
          className="flex items-center justify-center gap-2"
        >
          <Chrome size={20} />
          Sign in with Google
        </Button>

        {/* Footer */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
};
