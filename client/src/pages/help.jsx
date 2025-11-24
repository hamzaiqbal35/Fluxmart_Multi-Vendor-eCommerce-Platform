import { useState } from 'react';

const Help = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      name: 'Getting Started',
      icon: '🚀',
      faqs: [
        {
          question: 'How do I create an account?',
          answer: 'Click on "Sign Up" in the top right corner. Fill in your email, create a password, and follow the verification steps. You\'ll be ready to shop in minutes!'
        },
        {
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page. Enter your email address, and we\'ll send you a reset link. Follow the instructions in the email to create a new password.'
        },
        {
          question: 'Can I change my account email?',
          answer: 'Yes! Go to Account Settings > Profile Information and click "Edit Email". Verify the new email address to complete the change.'
        }
      ]
    },
    {
      name: 'Shopping & Orders',
      icon: '🛍️',
      faqs: [
        {
          question: 'How do I place an order?',
          answer: 'Browse products, add items to your cart, proceed to checkout, enter your shipping address, choose a shipping method, and complete payment. You\'ll receive an order confirmation email.'
        },
        {
          question: 'Can I modify my order after placing it?',
          answer: 'If your order hasn\'t shipped yet, contact us within 1 hour of purchase. We may be able to modify or cancel it. Once shipped, modifications aren\'t possible.'
        },
        {
          question: 'How do I track my order?',
          answer: 'Log into your account and go to "My Orders". Click on the specific order to view tracking information. You\'ll also receive tracking updates via email.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'For Now we only accept Cash on Delivery (COD). We are working on adding more payment options soon!'
        }
      ]
    },
    {
      name: 'Returns & Refunds',
      icon: '↩️',
      faqs: [
        {
          question: 'What is your return policy?',
          answer: 'We offer 30 days from delivery for most items. Products must be unused and in original packaging. Some items have different policies - check product details.'
        },
        {
          question: 'How long does a refund take?',
          answer: 'Once we receive and inspect your return, refunds are processed within 5-7 business days. It may take an additional 3-5 days for the credit to appear in your account.'
        }
      ]
    },
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0 || searchQuery === '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Find answers to common questions or contact our support team
          </p>
          
          {/* Search Box */}
          <div className="max-w-2xl mx-auto">
            <label htmlFor="help-search" className="sr-only">Search help articles</label>
            <div className="relative">
              <input
                id="help-search"
                name="helpSearch"
                type="search"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Search help articles"
              />
              <svg
                className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-20">
                <div className="p-6 bg-blue-50 border-b-2 border-blue-600">
                  <h3 className="font-semibold text-gray-900">Categories</h3>
                </div>
                <div className="divide-y">
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveCategory(index)}
                      className={`w-full text-left px-6 py-4 transition-colors duration-200 ${
                        activeCategory === index
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="mr-2">{category.icon}</span>
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-2 text-gray-900">
                  {categories[activeCategory]?.name}
                </h2>
                <p className="text-gray-600 mb-8">
                  Common questions about {categories[activeCategory]?.name.toLowerCase()}
                </p>

                {/* FAQ Items */}
                <div className="space-y-4">
                  {categories[activeCategory]?.faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                    >
                      <button
                        onClick={() =>
                          setExpandedFaq(
                            expandedFaq === `${activeCategory}-${index}`
                              ? null
                              : `${activeCategory}-${index}`
                          )
                        }
                        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between font-semibold text-gray-900"
                      >
                        {faq.question}
                        <svg
                          className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
                            expandedFaq === `${activeCategory}-${index}`
                              ? 'transform rotate-180'
                              : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>
                      {expandedFaq === `${activeCategory}-${index}` && (
                        <div className="px-6 py-4 bg-white border-t border-gray-200 text-gray-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Support */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Didn't find what you're looking for?</h3>
                <p className="text-gray-600 mb-4">
                  Our support team is here to help. Reach out to us anytime.
                </p>
                <a
                  href="/contact"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Quick Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="/contact"
              className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg hover:shadow-lg transition-shadow duration-200 border border-purple-200"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">💬 Contact Us</h3>
              <p className="text-gray-600">Get in touch with our support team</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;