import { useState } from 'react';

// Help page - FAQs and contact form
export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const faqs = [
    {
      question: 'How do I edit my profile information?',
      answer: 'Click on your profile icon in the top right corner and select "Profile". From there, click the "Edit Profile" button to update your information including name, email, phone, and address.',
    },
    {
      question: 'How do I change my password?',
      answer: 'Go to your Profile page (click your icon → Profile), scroll down to the "Password & Security" section, and click "Change Password". You\'ll need to enter your current password and choose a new one (minimum 8 characters).',
    },
    {
      question: 'How do I view upcoming events?',
      answer: 'Click on "Events" in the left sidebar to see all upcoming 4-H events. You can view event details by clicking on any event card, and RSVP if you plan to attend.',
    },
    {
      question: 'How do I access the calendar?',
      answer: 'Click on "Calendar" in the left sidebar to view all events in a calendar format. You can switch between month, week, and day views to see your schedule.',
    },
    {
      question: 'Where can I see member posts and updates?',
      answer: 'The "Social Feed" page shows recent posts, announcements, and updates from club members and officers. You can like, comment, and share posts to engage with the community.',
    },
    {
      question: 'How do I read blog posts?',
      answer: 'Click on "Blog" in the left sidebar to see all published blog posts. Click on any post to read the full article. Blog posts cover club news, member achievements, and educational content.',
    },
    {
      question: 'How do I access shared files and documents?',
      answer: 'Click on "Files" in the left sidebar to access the club\'s document library. Files are organized by category and you can search, download, and (if you have permission) upload documents.',
    },
    {
      question: 'Who are the club officers and how do I contact them?',
      answer: 'Click on "Officers" in the left sidebar to see a list of all club officers with their contact information. You can reach out to them directly via email or phone for any questions or assistance.',
    },
    {
      question: 'How do I find other club members?',
      answer: 'Click on "Members" in the left sidebar to browse the member directory. You can search for members by name and view their profiles.',
    },
    {
      question: 'What should I do if I forgot my password?',
      answer: 'On the login page, click "Forgot Password" and enter your email address. You\'ll receive a password reset link via email. Follow the instructions to set a new password.',
    },
    {
      question: 'How do I get notifications about new events or posts?',
      answer: 'Check the notification bell icon in the top navigation bar. You\'ll receive notifications when new events are posted, when someone responds to your posts, or when important announcements are made.',
    },
    {
      question: 'Can I access the site on my mobile phone?',
      answer: 'Yes! The Bibber Creek Spurs 4-H site is fully responsive and works great on mobile devices. Simply visit the website from your phone\'s browser.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Connect to real API/email service
    // For now, simulate sending email
    console.log('Contact form submitted:', {
      ...contactForm,
      to: 'bibbercreekspurs4h@gmail.com',
    });

    setSubmitStatus({
      type: 'success',
      text: 'Your message has been sent! We\'ll get back to you soon.',
    });

    // Reset form
    setContactForm({
      name: '',
      email: '',
      subject: '',
      message: '',
    });

    // Clear success message after 5 seconds
    setTimeout(() => setSubmitStatus(null), 5000);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
      <p className="text-gray-600 mb-8">
        Find answers to common questions or contact us for assistance
      </p>

      {/* FAQs Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={openFaq === index}
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openFaq === index ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 text-gray-600">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Contact Us</h2>
        <p className="text-gray-600 mb-6">
          Can't find what you're looking for? Send us a message and we'll help you out!
        </p>

        {submitStatus && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              submitStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {submitStatus.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={contactForm.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={contactForm.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={contactForm.subject}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={contactForm.message}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              📧 Send Message
            </button>
            <p className="text-sm text-gray-600">
              We'll respond to <strong>bibbercreekspurs4h@gmail.com</strong>
            </p>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Other ways to reach us:</strong>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            📧 Email: <a href="mailto:bibbercreekspurs4h@gmail.com" className="text-primary-600 hover:underline">bibbercreekspurs4h@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
