"use client"

import React from 'react'
import Image from 'next/image'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Image 
            src="/tluca-logo.png" 
            alt="TLUCA Systems Logo" 
            width={100} 
            height={100}
            className="object-contain"
          />
        </div>

        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg">
            Effective Date: October 20, 2025
          </p>
          </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300">
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Overview</h2>
            <p className="mb-4">
              This Privacy Policy describes how TLUCA Systems LLC ("we," "our," or "us") collects, uses, and protects personal information when you visit our website, use our platform, or subscribe to our Website-as-a-Service ("WaaS") offerings.
            </p>
            <p>
              By using our services, you consent to the terms outlined in this Privacy Policy.
            </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-4">
              We collect the following types of data when you interact with our services:
            </p>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-3">Personal Information:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Name, business name, email address, phone number, and billing details.</li>
                <li>Login credentials and authentication tokens.</li>
              </ul>
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-3">Usage Data:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>IP address, browser type, pages visited, and actions performed within your TLUCA Systems account.</li>
              </ul>
            </div>
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-3">Payment Data:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Processed securely via Stripe or other trusted third-party processors. We never store full payment card numbers.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Client Data:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Data you or your business upload (contacts, leads, form submissions, website content, etc.) is stored securely and remains your property.</li>
              </ul>
            </div>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Provide and improve our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate updates, invoices, and support information</li>
              <li>Personalize your dashboard or website experience</li>
              <li>Comply with legal and tax obligations</li>
              <li>Send occasional SMS updates about your order, project progress, and service notifications (with your consent)</li>
              </ul>
            <p>
              We may use anonymized or aggregated data for internal analytics and performance tracking.
              </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3.1 SMS Communications</h2>
            <p className="mb-4">
              We send occasional SMS updates about your order, project progress, and service notifications when you provide consent during onboarding. By agreeing to receive SMS communications:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>You consent to receive text messages from TLUCA Systems at the phone number you provide</li>
              <li>Message and data rates may apply based on your carrier's plan</li>
              <li>Message frequency varies based on your project status</li>
              <li>You can opt out at any time by replying STOP to any message</li>
              <li>Reply HELP for assistance or contact <a href="mailto:help@tlucasystems.com" className="text-white hover:text-gray-400 underline transition-colors">help@tlucasystems.com</a></li>
              </ul>
            
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Mobile Information Privacy</h3>
              <p className="mb-2">
                <strong className="text-white">No mobile information will be shared with third parties/affiliates for marketing/promotional purposes.</strong> Information sharing to subcontractors in support services, such as customer service is permitted. All other use case categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties, except for aggregators and providers of the Text Message services.
              </p>
              <p>
                Text messaging originator opt-in data and consent will not be shared with any third parties, except for aggregators and providers of the Text Message services.
              </p>
            </div>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing</h2>
            <p className="mb-4">
              We do not sell or rent your personal data. We only share limited information with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong className="text-white">Service Providers:</strong> For hosting, payments, analytics, and customer communication (e.g., GoHighLevel, Mailgun, Stripe, AWS). Information sharing to subcontractors in support services, such as customer service is permitted.</li>
              <li><strong className="text-white">Legal Authorities:</strong> If required by law or to protect our rights and users' safety.</li>
              </ul>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <p className="text-white font-semibold mb-2">Important: Text Messaging Data Exclusion</p>
              <p>
                <strong className="text-white">All the above categories exclude text messaging originator opt-in data and consent;</strong> this information will not be shared with any third parties, excluding aggregators and providers of the Text Message services.
              </p>
            </div>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention & Deletion</h2>
            <p className="mb-4">
              Your data is stored securely as long as your account is active. If your subscription ends, we retain backups for up to 30 days before permanent deletion.
            </p>
            <p>
              You may request early deletion by emailing <a href="mailto:help@tlucasystems.com" className="text-white hover:text-gray-400 underline transition-colors">help@tlucasystems.com</a>.
              </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Security</h2>
            <p className="mb-4">
              We implement encryption, access control, and data isolation measures to safeguard user information.
            </p>
            <p>
              While we take reasonable precautions, no online system is 100% secure.
              </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>
            <p className="mb-4">
              We use cookies and analytics tools to enhance your experience, track website performance, and identify returning users.
            </p>
            <p>
              You can disable cookies in your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
            <p className="mb-4">You may:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Access, correct, or delete your personal data</li>
              <li>Request account closure</li>
              <li>Withdraw consent for communications</li>
              </ul>
            <p>
              Contact <a href="mailto:help@tlucasystems.com" className="text-white hover:text-gray-400 underline transition-colors">help@tlucasystems.com</a> to exercise these rights.
            </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Policy Updates</h2>
            <p>
              We may update this policy periodically. The latest version will always be available on our website with a revised effective date.
              </p>
            </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
            <p className="mb-4">
              If you have any privacy concerns or requests, contact us at:
            </p>
            <p className="text-white">
              <a href="mailto:help@tlucasystems.com" className="hover:text-gray-400 transition-colors">
                help@tlucasystems.com
              </a>
              </p>
            </section>
          </div>

        {/* Back to Home */}
        <div className="text-center mt-16">
          <a 
            href="/"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>← Back to Home</span>
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-16 pb-8">
          <p>© 2025 TLUCA Systems LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
