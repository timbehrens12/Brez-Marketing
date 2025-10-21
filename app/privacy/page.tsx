"use client"

import React from 'react'
import { Shield, Mail } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff2a2a] to-[#cc0000] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-white font-bold text-xl">TLUCA Systems</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#ff2a2a]/20 to-[#cc0000]/20 border border-[#ff2a2a]/30 rounded-2xl mb-6">
            <Shield className="w-8 h-8 text-[#ff2a2a]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg">
            Effective Date: October 20, 2025
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
          <div className="prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-li:text-gray-300 max-w-none">
            
            <h2 className="text-2xl font-bold text-white mb-4">1. Overview</h2>
            <p className="text-gray-300 mb-6">
              This Privacy Policy describes how TLUCA Systems LLC ("we," "our," or "us") collects, uses, and protects personal information when you visit our website, use our platform, or subscribe to our Website-as-a-Service ("WaaS") offerings.
            </p>
            <p className="text-gray-300 mb-8">
              By using our services, you consent to the terms outlined in this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              We collect the following types of data when you interact with our services:
            </p>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Personal Information:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Name, business name, email address, phone number, and billing details.</li>
                <li>Login credentials and authentication tokens.</li>
              </ul>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Usage Data:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>IP address, browser type, pages visited, and actions performed within your TLUCA Systems account.</li>
              </ul>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Payment Data:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Processed securely via Stripe or other trusted third-party processors. We never store full payment card numbers.</li>
              </ul>
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3">Client Data:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
                <li>Data you or your business upload (contacts, leads, form submissions, website content, etc.) is stored securely and remains your property.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>Provide and improve our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate updates, invoices, and support information</li>
              <li>Personalize your dashboard or website experience</li>
              <li>Comply with legal and tax obligations</li>
            </ul>
            <p className="text-gray-300 mb-8">
              We may use anonymized or aggregated data for internal analytics and performance tracking.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing</h2>
            <p className="text-gray-300 mb-4">
              We do not sell or rent your personal data. We only share limited information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-8">
              <li><strong className="text-white">Service Providers:</strong> For hosting, payments, analytics, and customer communication (e.g., GoHighLevel, Mailgun, Stripe, AWS).</li>
              <li><strong className="text-white">Legal Authorities:</strong> If required by law or to protect our rights and users' safety.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention & Deletion</h2>
            <p className="text-gray-300 mb-4">
              Your data is stored securely as long as your account is active. If your subscription ends, we retain backups for up to 30 days before permanent deletion.
            </p>
            <p className="text-gray-300 mb-8">
              You may request early deletion by emailing <a href="mailto:tbehrens121@gmail.com" className="text-[#ff2a2a] hover:text-[#ff4444] underline">tbehrens121@gmail.com</a>.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">6. Security</h2>
            <p className="text-gray-300 mb-4">
              We implement encryption, access control, and data isolation measures to safeguard user information.
            </p>
            <p className="text-gray-300 mb-8">
              While we take reasonable precautions, no online system is 100% secure.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>
            <p className="text-gray-300 mb-4">
              We use cookies and analytics tools to enhance your experience, track website performance, and identify returning users.
            </p>
            <p className="text-gray-300 mb-8">
              You can disable cookies in your browser settings at any time.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
            <p className="text-gray-300 mb-4">You may:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>Access, correct, or delete your personal data</li>
              <li>Request account closure</li>
              <li>Withdraw consent for communications</li>
            </ul>
            <p className="text-gray-300 mb-8">
              Contact <a href="mailto:tbehrens121@gmail.com" className="text-[#ff2a2a] hover:text-[#ff4444] underline">tbehrens121@gmail.com</a> to exercise these rights.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">9. Policy Updates</h2>
            <p className="text-gray-300 mb-8">
              We may update this policy periodically. The latest version will always be available on our website with a revised effective date.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p className="text-gray-300 mb-4">
              If you have any privacy concerns or requests, contact us at:
            </p>
            <div className="bg-gradient-to-br from-[#ff2a2a]/10 to-[#cc0000]/10 border border-[#ff2a2a]/20 rounded-xl p-6 mt-6">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-[#ff2a2a]" />
                <a href="mailto:tbehrens121@gmail.com" className="text-white hover:text-[#ff2a2a] transition-colors">
                  tbehrens121@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a 
            href="/"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>← Back to Home</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 TLUCA Systems LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
