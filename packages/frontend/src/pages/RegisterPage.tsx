import { Link } from 'react-router-dom';

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full card">
        <h2 className="text-3xl font-bold text-center mb-6">Join 4-H</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="First Name" className="input" required />
            <input type="text" placeholder="Last Name" className="input" required />
          </div>
          <input type="email" placeholder="Email" className="input" required />
          <input type="password" placeholder="Password" className="input" required />
          <input type="password" placeholder="Confirm Password" className="input" required />
          <button type="submit" className="btn-primary w-full">
            Create Account
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
