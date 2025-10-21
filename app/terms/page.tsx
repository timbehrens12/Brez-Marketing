"use client"

import React from 'react'
import { Scale, Mail } from 'lucide-react'

export default function TermsAndConditionsPage() {
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
            <Scale className="w-8 h-8 text-[#ff2a2a]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Terms & Conditions
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
              These Terms & Conditions ("Terms") govern your use of TLUCA Systems LLC ("we," "our," "us") products and services, including websites, CRM systems, automations, integrations, and AI tools ("Services").
            </p>
            <p className="text-gray-300 mb-8">
              By creating an account or subscribing to any plan, you agree to these Terms.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">2. Services Provided</h2>
            <p className="text-gray-300 mb-4">
              TLUCA Systems LLC offers Website-as-a-Service (WaaS) solutions built on the GoHighLevel platform. Services include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-8">
              <li>Custom or template-based websites</li>
              <li>CRM and automation access</li>
              <li>AI tools and chatbots</li>
              <li>Email and SMS marketing integrations</li>
              <li>Hosting and ongoing technical maintenance</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">3. Account & Access</h2>
            <p className="text-gray-300 mb-4">You are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>Ensuring all account data you provide is accurate</li>
              <li>Any activity under your account</li>
            </ul>
            <p className="text-gray-300 mb-8">
              If suspicious or unauthorized use is detected, we may suspend access pending review.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">4. Subscription & Payment</h2>
            <p className="text-gray-300 mb-4">
              Subscriptions are billed automatically according to your selected plan (e.g., monthly or annually).
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>Payments are processed through Stripe.</li>
              <li>Failed payments trigger automatic retries over 7 days. If unpaid after retries, your account and website access will be temporarily suspended until payment is resolved.</li>
              <li>After 14 days of non-payment, your account may be permanently deactivated and associated data deleted.</li>
              <li>All fees are non-refundable once a billing cycle begins unless otherwise stated in writing.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">5. Cancellations</h2>
            <p className="text-gray-300 mb-4">
              You may cancel your subscription anytime through your account dashboard or by emailing support.
            </p>
            <p className="text-gray-300 mb-8">
              Your access will remain active until the end of the current billing period. No prorated refunds are issued for early cancellations.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">6. Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-8">
              <li>All code, designs, templates, and systems built by TLUCA Systems LLC remain our exclusive intellectual property.</li>
              <li>Clients retain ownership of their uploaded materials (content, images, logos, etc.).</li>
              <li>You are not permitted to resell, duplicate, or white-label our platform without prior written consent.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">7. Acceptable Use</h2>
            <p className="text-gray-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>Use our platform for spam, scams, or unlawful content</li>
              <li>Attempt to breach or reverse-engineer the system</li>
              <li>Interfere with other users or servers</li>
            </ul>
            <p className="text-gray-300 mb-8">
              Violation of these terms may result in immediate suspension or termination.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">8. Warranties & Disclaimers</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-8">
              <li>Our Services are provided "as is" without warranties of any kind.</li>
              <li>We make no guarantees regarding uptime, conversions, or specific outcomes.</li>
              <li>We are not responsible for interruptions caused by third-party providers or integrations.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-8">
              <li>To the maximum extent permitted by law, TLUCA Systems LLC shall not be liable for indirect, incidental, or consequential damages.</li>
              <li>Our total liability for any claim shall not exceed the total amount you paid us within the previous three (3) months.</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
            <p className="text-gray-300 mb-4">
              We reserve the right to suspend or terminate any account at our discretion if:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-6">
              <li>You violate these Terms</li>
              <li>Payments remain overdue</li>
              <li>Illegal or harmful activity is detected</li>
            </ul>
            <p className="text-gray-300 mb-8">
              Upon termination, your access ceases immediately and data may be deleted after 30 days.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
            <p className="text-gray-300 mb-8">
              These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-law principles.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">12. Updates to Terms</h2>
            <p className="text-gray-300 mb-8">
              We may modify these Terms at any time. Updates take effect immediately upon posting on our website.
            </p>

            <h2 className="text-2xl font-bold text-white mb-4">13. Contact</h2>
            <p className="text-gray-300 mb-4">
              Questions about these Terms can be sent to:
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
