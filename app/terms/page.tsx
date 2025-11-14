"use client"

import React from 'react'
import Image from 'next/image'

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
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
            Terms & Conditions
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
              These Terms & Conditions ("Terms") govern your use of TLUCA Systems LLC ("we," "our," "us") products and services, including websites, CRM systems, automations, integrations, and AI tools ("Services").
            </p>
            <p>
              By creating an account or subscribing to any plan, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Services Provided</h2>
            <p className="mb-4">
              TLUCA Systems LLC offers Website-as-a-Service (WaaS) solutions built on the GoHighLevel platform. Services include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Custom or template-based websites</li>
              <li>CRM and automation access</li>
              <li>AI tools and chatbots</li>
              <li>Email and SMS marketing integrations</li>
              <li>Hosting and ongoing technical maintenance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2.1 SMS Communications</h2>
            <p className="mb-4">
              We send occasional SMS updates about your order, project progress, and service notifications when you provide consent during onboarding.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>You consent to receive text messages from TLUCA Systems at the phone number you provide</li>
              <li>Message and data rates may apply based on your carrier's plan</li>
              <li>Message frequency varies based on your project status</li>
              <li>You can opt out at any time by replying STOP to any message</li>
              <li>Reply HELP for assistance or contact <a href="mailto:help@tlucasystems.com" className="text-white hover:text-gray-400 underline transition-colors">help@tlucasystems.com</a></li>
            </ul>
            <p>
              By providing your phone number and checking the SMS consent box, you agree to these SMS terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Account & Access</h2>
            <p className="mb-4">You are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>Ensuring all account data you provide is accurate</li>
              <li>Any activity under your account</li>
            </ul>
            <p>
              If suspicious or unauthorized use is detected, we may suspend access pending review.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Subscription & Payment</h2>
            <p className="mb-4">
              Subscriptions are billed automatically according to your selected plan (e.g., monthly or annually).
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Payments are processed through Stripe.</li>
              <li>Failed payments trigger automatic retries over 7 days. If unpaid after retries, your account and website access will be temporarily suspended until payment is resolved.</li>
              <li>After 14 days of non-payment, your account may be permanently deactivated and associated data deleted.</li>
              <li>All fees are non-refundable once a billing cycle begins unless otherwise stated in writing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Cancellations</h2>
            <p className="mb-4">
              You may cancel your subscription anytime through your account dashboard or by emailing support.
            </p>
            <p>
              Your access will remain active until the end of the current billing period. No prorated refunds are issued for early cancellations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>All code, designs, templates, and systems built by TLUCA Systems LLC remain our exclusive intellectual property.</li>
              <li>Clients retain ownership of their uploaded materials (content, images, logos, etc.).</li>
              <li>You are not permitted to resell, duplicate, or white-label our platform without prior written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Use our platform for spam, scams, or unlawful content</li>
              <li>Attempt to breach or reverse-engineer the system</li>
              <li>Interfere with other users or servers</li>
            </ul>
            <p>
              Violation of these terms may result in immediate suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Warranties & Disclaimers</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Our Services are provided "as is" without warranties of any kind.</li>
              <li>We make no guarantees regarding uptime, conversions, or specific outcomes.</li>
              <li>We are not responsible for interruptions caused by third-party providers or integrations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To the maximum extent permitted by law, TLUCA Systems LLC shall not be liable for indirect, incidental, or consequential damages.</li>
              <li>Our total liability for any claim shall not exceed the total amount you paid us within the previous three (3) months.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate any account at our discretion if:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>You violate these Terms</li>
              <li>Payments remain overdue</li>
              <li>Illegal or harmful activity is detected</li>
            </ul>
            <p>
              Upon termination, your access ceases immediately and data may be deleted after 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Texas, USA, without regard to its conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Updates to Terms</h2>
            <p>
              We may modify these Terms at any time. Updates take effect immediately upon posting on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact</h2>
            <p className="mb-4">
              Questions about these Terms can be sent to:
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
