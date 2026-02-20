import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'PARENT' | 'YOUTH_MEMBER'>('PARENT');
  const [youthFirstName, setYouthFirstName] = useState('');
  const [youthLastName, setYouthLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation Register($input: RegisterInput!) {
              register(input: $input) {
                success
                message
              }
            }
          `,
          variables: {
            input: {
              firstName,
              lastName,
              email,
              password,
              role,
              ...(role === 'PARENT' && youthFirstName && youthLastName
                ? { youthFirstName, youthLastName }
                : {}),
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        setError(result.errors[0]?.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      if (result.data?.register?.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="card">
            <div className="text-5xl mb-4">&#9989;</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              Thanks for creating your account! The site admin will review your submission soon!
            </p>
            <Link to="/login" className="btn-primary inline-block">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Create an Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Membership is only for current Bibber Creek Spurs 4H members and their parents and youth leaders, and must be approved by the site admin.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              I am a...
            </label>
            <select
              id="role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as 'PARENT' | 'YOUTH_MEMBER')}
            >
              <option value="PARENT">Parent / Adult Leader</option>
              <option value="YOUTH_MEMBER">Youth Member</option>
            </select>
          </div>

          {role === 'PARENT' && (
            <div className="rounded-md bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Add your youth member (optional)
              </p>
              <p className="text-xs text-gray-500">
                If your youth member already has an account, we'll automatically link your accounts.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="youthFirstName" className="block text-xs font-medium text-gray-600 mb-1">
                    Youth First Name
                  </label>
                  <input
                    id="youthFirstName"
                    type="text"
                    className="input text-sm"
                    value={youthFirstName}
                    onChange={(e) => setYouthFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="youthLastName" className="block text-xs font-medium text-gray-600 mb-1">
                    Youth Last Name
                  </label>
                  <input
                    id="youthLastName"
                    type="text"
                    className="input text-sm"
                    value={youthLastName}
                    onChange={(e) => setYouthLastName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
