import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'PARENT' | 'YOUTH_MEMBER'>('PARENT');
  const [youthFirstName, setYouthFirstName] = useState('');
  const [youthLastName, setYouthLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [horseExperience, setHorseExperience] = useState('');
  const [horseName, setHorseName] = useState('');
  const [noHorse, setNoHorse] = useState(false);
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
              phone: phone || undefined,
              birthday: birthday || undefined,
              horseExperience: horseExperience || undefined,
              horseName: noHorse ? undefined : (horseName || undefined),
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Request Sent!</h2>
            <p className="text-gray-600 mb-6">
              Thanks for your interest in Bibber Creek Spurs 4-H! Our club leader will review your submission and reach out with next steps.
            </p>
            <Link to="/login" className="btn-primary inline-block">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const youthFields = (
    <div className="space-y-4">
      <div>
        <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
          Birthday
        </label>
        <input
          id="birthday"
          type="date"
          className="input"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          className="input"
          placeholder="(303) 555-1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="horseExperience" className="block text-sm font-medium text-gray-700 mb-1">
          Horse Experience Level
        </label>
        <select
          id="horseExperience"
          className="input"
          value={horseExperience}
          onChange={(e) => setHorseExperience(e.target.value)}
        >
          <option value="">Select experience level...</option>
          <option value="none">No Experience</option>
          <option value="some">Some Experience</option>
          <option value="regular">Regular Rider</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="horseName" className="block text-sm font-medium text-gray-700 mb-1">
          Horse Name
        </label>
        <input
          id="horseName"
          type="text"
          className="input"
          placeholder="Your horse's name"
          value={horseName}
          onChange={(e) => setHorseName(e.target.value)}
          disabled={noHorse}
        />
        <label className="flex items-center mt-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            checked={noHorse}
            onChange={(e) => {
              setNoHorse(e.target.checked);
              if (e.target.checked) setHorseName('');
            }}
          />
          I don't have a horse yet
        </label>
      </div>
    </div>
  );

  return (
    <div className="bg-white -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center pt-10 pb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Join Our Herd
          </h1>
          <p className="mt-3 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Blue Hero Box */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-5 text-center mb-10">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed">
            Where young horsemen and horsewomen learn to ride, lead, and grow together in the heart of the Colorado foothills.
          </p>
        </div>

        {/* Membership Investment & When We Meet */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Membership Investment */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">Membership Investment</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <p className="font-semibold text-gray-900">Ages 8-18</p>
                <p className="text-2xl font-bold text-primary-700">$50<span className="text-sm font-normal text-gray-600">/year</span></p>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <p className="font-semibold text-gray-900">Ages 5-7 (Cloverbuds)</p>
                <p className="text-2xl font-bold text-primary-700">$20<span className="text-sm font-normal text-gray-600">/year</span></p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              *Additional costs for project supplies. Financial assistance available — call (303) 271-6620 for information.
            </p>
          </div>

          {/* When We Meet */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-5">When We Meet</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-label="Calendar">&#128197;</span>
                <div>
                  <p className="font-semibold text-gray-900">Club Meetings</p>
                  <p className="text-gray-600">2nd Tuesday of each month</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-label="Horse">&#128014;</span>
                <div>
                  <p className="font-semibold text-gray-900">Ride Nights</p>
                  <p className="text-gray-600">4th Saturday of each month</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-label="Location">&#128205;</span>
                <p className="font-semibold text-gray-900">Located in the Golden area</p>
              </div>
            </div>
          </div>
        </div>

        {/* Volunteer Section */}
        <div className="card bg-gray-50 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Volunteer &amp; Community Service</h2>
          <p className="text-gray-700 leading-relaxed">
            We love community service projects that get the kids and parents involved in our local community — opportunities to participate in running horse shows throughout the year, raise money by gift wrapping for the holidays, make blankets for hospitals and elderly. And so much more.
          </p>
        </div>

        {/* Registration Form */}
        <div className="card border-2 border-primary-200 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Ready to Join the Herd?</h2>
          <p className="text-gray-600 text-center mb-6">
            Fill out this form and our club leader will reach out with next steps!
          </p>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
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

            {/* Youth-specific fields - shown directly for YOUTH_MEMBER */}
            {role === 'YOUTH_MEMBER' && (
              <div className="rounded-lg bg-primary-50 p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Your Horse &amp; Riding Info</p>
                {youthFields}
              </div>
            )}

            {/* Parent: youth member section */}
            {role === 'PARENT' && (
              <div className="rounded-lg bg-primary-50 p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-800">Youth Member Information</p>
                <p className="text-xs text-gray-500">
                  Tell us about the young rider you're registering.
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
                {youthFields}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Information Request'}
            </button>
          </form>
        </div>

        {/* Contact Club Leader */}
        <div className="text-center mb-10">
          <p className="text-gray-600 font-medium">Questions? Contact Our Club Leader</p>
          <a
            href="mailto:bibbercreekspurs4h@gmail.com"
            className="text-primary-600 hover:text-primary-700 font-semibold text-lg"
          >
            bibbercreekspurs4h@gmail.com
          </a>
        </div>

        {/* Your Journey Starts Here */}
        <div className="bg-gray-50 rounded-lg py-10 px-6 mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
            Your Journey Starts Here
          </h2>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-0">
            <div className="text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Submit Interest</h3>
              <p className="text-gray-600 text-sm">
                Fill out the form above or email our club leader directly
              </p>
            </div>
            <div className="hidden md:flex items-center text-gray-400 text-2xl pt-4">&rarr;</div>
            <div className="md:hidden text-gray-400 text-xl">&darr;</div>
            <div className="text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Attend a Meeting</h3>
              <p className="text-gray-600 text-sm">
                Join us for a club meeting to see if we're a good fit
              </p>
            </div>
            <div className="hidden md:flex items-center text-gray-400 text-2xl pt-4">&rarr;</div>
            <div className="md:hidden text-gray-400 text-xl">&darr;</div>
            <div className="text-center flex-1">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Enroll Online</h3>
              <p className="text-gray-600 text-sm">
                Complete enrollment through 4-HOnline and start your 4-H journey
              </p>
            </div>
          </div>
        </div>

        {/* Important Dates */}
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
            Important 2025/2026 Dates
          </h2>
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-28 text-right">
                <p className="font-bold text-primary-700">Oct 1, 2025</p>
              </div>
              <div className="w-px bg-primary-300 self-stretch" />
              <p className="font-semibold text-gray-900">Enrollment Opens</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-28 text-right">
                <p className="font-bold text-primary-700">Oct 19, 2025</p>
              </div>
              <div className="w-px bg-primary-300 self-stretch" />
              <div>
                <p className="font-semibold text-gray-900">4-H Open House</p>
                <p className="text-sm text-gray-600">1:30-3:00 PM at Jeffco Fairgrounds</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-28 text-right">
                <p className="font-bold text-primary-700">May 1, 2026</p>
              </div>
              <div className="w-px bg-primary-300 self-stretch" />
              <div>
                <p className="font-semibold text-gray-900">Final Enrollment Deadline</p>
                <p className="text-sm text-gray-600">For Fair Participation</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-28 text-right">
                <p className="font-bold text-primary-700 text-sm leading-tight">Jul 26 –<br />Aug 3, 2026</p>
              </div>
              <div className="w-px bg-primary-300 self-stretch" />
              <p className="font-semibold text-gray-900">Jefferson County 4-H Fair</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
