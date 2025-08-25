import { GridOverlay } from "@/components/GridOverlay"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] py-12 px-4 animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-r border-[#333] min-h-[calc(100vh-6rem)] p-6 rounded-l-xl">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-6">Legal</h3>
              <div className="space-y-2">
                <a href="/terms" className="block px-3 py-2 rounded-lg bg-[#333] text-white font-medium">
                  Terms of Service
                </a>
                <a href="/privacy" className="block px-3 py-2 rounded-lg text-gray-400 hover:bg-[#333] hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="/data-security" className="block px-3 py-2 rounded-lg text-gray-400 hover:bg-[#333] hover:text-white transition-colors">
                  Data Security
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 pl-8">
            <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>

            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-8 rounded-lg border border-[#333] text-white shadow-xl">
          <div className="prose max-w-none">
            <p className="mb-6 text-sm text-gray-400">
              Last updated: August 13, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
              <p className="mb-4 text-gray-300">
                By accessing or using the Brez Marketing Platform ("Service", "Platform"), you agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service. These Terms apply to all users, including agencies, businesses, and individuals using our marketing analytics and AI-powered tools.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">2. Service Description</h2>
              <p className="mb-4 text-gray-300">
                The Brez Marketing Platform provides comprehensive marketing analytics, AI-powered insights, and business intelligence tools including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Marketing Analytics:</strong> Integration with Meta Ads and Shopify for performance tracking and analysis</li>
                <li><strong>AI Marketing Assistant:</strong> Automated insights, recommendations, and strategic advice tailored to your business niche</li>
                <li><strong>Campaign Management:</strong> Tools for analyzing and optimizing advertising campaigns across platforms</li>
                <li><strong>Lead Generation:</strong> AI-powered lead discovery and scoring systems for business growth</li>
                <li><strong>Report Generation:</strong> Automated marketing reports and performance summaries with agency branding</li>
                <li><strong>Agency Tools:</strong> Branding, contract generation, and client management features</li>
                <li><strong>Data Visualization:</strong> Dashboards and analytics for business performance tracking</li>
                <li><strong>Industry-Specific Insights:</strong> Niche-based recommendations for various business verticals</li>
                <li><strong>Platform Connection Management:</strong> Secure integration and monitoring of third-party platforms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">3. AI-Powered Features and Limitations</h2>
              <p className="mb-4 text-gray-300">
                Our platform incorporates artificial intelligence to enhance your marketing effectiveness. By using our AI features, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>AI Recommendations:</strong> AI-generated insights and recommendations are for informational purposes only and should not be considered as guaranteed outcomes or professional marketing advice</li>
                <li><strong>Human Oversight:</strong> You retain full responsibility for all marketing decisions and campaign strategies based on AI recommendations</li>
                <li><strong>Data Accuracy:</strong> While we strive for accuracy, AI-generated content may contain errors and should be validated against your business knowledge</li>
                <li><strong>Industry-Specific Insights:</strong> AI uses your brand niche information to provide tailored recommendations, but results may vary by market conditions and local factors</li>
                <li><strong>Continuous Learning:</strong> Our AI models continuously improve, and recommendations may evolve over time as algorithms are updated</li>
                <li><strong>Usage Limitations:</strong> AI features include daily usage limits to ensure fair access and optimal performance for all users</li>
                <li><strong>No Guarantee of Results:</strong> AI recommendations do not guarantee improved marketing performance, increased ROI, or business outcomes</li>
                <li><strong>Brand Niche Context:</strong> Providing accurate brand niche information improves AI recommendation quality, but you may update this information at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">4. Use of Third-Party Platforms</h2>
              <p className="mb-4 text-gray-300">
                Our service integrates with third-party platforms to provide comprehensive analytics. By using our service:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>You agree to comply with Meta's Platform Terms, Community Standards, and Developer Policies</li>
                <li>You agree to comply with Shopify's API Terms of Service and Partner Program Agreement where applicable</li>
                <li>You authorize us to access and process data from these platforms on your behalf within the scope of our services</li>
                <li>You understand that we are not affiliated with Meta or Shopify, and these platforms may change their terms, functionality, or availability at any time</li>
                <li>You are responsible for maintaining valid accounts and compliance with these third-party platforms</li>
                <li>Platform disconnections or API changes may affect service functionality without liability to us</li>
                <li><strong>Token Expiration:</strong> Meta connections expire every 60 days for security purposes, and you are responsible for reconnecting when notified</li>
                <li><strong>Data Synchronization:</strong> Platform data sync may be delayed due to API rate limits or platform maintenance</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">5. Data Usage, Privacy, and AI Processing</h2>
              <p className="mb-4 text-gray-300">
                We handle your data in accordance with our Privacy Policy, which is incorporated by reference into these Terms. Additionally:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>We only collect data necessary to provide our marketing analytics and AI-powered services</li>
                <li>Your business data may be processed by AI systems to generate insights and recommendations specific to your industry niche</li>
                <li>We do not sell your personal information or business data to third parties</li>
                <li>AI processing may involve third-party services, but your raw business data is protected under confidentiality agreements</li>
                <li>We implement appropriate security measures to protect your data during processing and storage</li>
                <li>Meta advertising data is retained for up to 90 days for analysis purposes</li>
                <li>You can request data deletion at any time through your account settings</li>
                <li>We comply with applicable data protection laws, including GDPR, CCPA, and other regional privacy regulations</li>
                <li><strong>Brand Niche Data:</strong> Your industry categorization is used solely to improve AI recommendation relevance and may be updated or removed at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">6. User Responsibilities and Acceptable Use</h2>
              <p className="mb-4 text-gray-300">
                As a user of our service, you agree to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Provide accurate and complete information when creating an account and setting up brand profiles</li>
                <li>Maintain the security of your account credentials and notify us immediately of unauthorized access</li>
                <li>Use the service only for lawful business purposes and in compliance with all applicable laws</li>
                <li>Not attempt to reverse engineer, probe, scan, or test the vulnerability of our systems</li>
                <li>Not use the service to generate, distribute, or store illegal content or malicious software</li>
                <li>Comply with all local laws regarding online conduct, data privacy, and acceptable content</li>
                <li>Not share account access with unauthorized parties or use the service on behalf of competitors</li>
                <li>Validate AI-generated recommendations before implementing marketing strategies</li>
                <li>Maintain appropriate licenses and permissions for any third-party platforms you connect</li>
                <li>Use lead generation features responsibly and in compliance with anti-spam regulations</li>
                <li><strong>Accurate Niche Information:</strong> Provide truthful business categorization to ensure appropriate AI recommendations</li>
                <li><strong>Platform Connection Maintenance:</strong> Respond promptly to connection expiration notifications to maintain service functionality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">7. Intellectual Property Rights</h2>
              <p className="mb-4 text-gray-300">
                The Brez Marketing Platform, including its content, features, functionality, AI algorithms, and user interface, are owned by us and are protected by international copyright, trademark, patent, and other intellectual property laws. You agree that:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>You may not copy, modify, distribute, sell, or lease any part of our service without prior written consent</li>
                <li>You retain ownership of your business data and content uploaded to the platform</li>
                <li>You grant us a limited license to use your data solely for providing services and generating AI insights</li>
                <li>AI-generated reports and insights remain your property for business use</li>
                <li>You may not extract, replicate, or reverse engineer our AI algorithms or methodologies</li>
                <li>Our trademarks, logos, and brand elements may not be used without explicit permission</li>
                <li><strong>Brand Niche Classifications:</strong> Industry categorizations provided are for service optimization and do not constitute business advice or market research</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">8. Service Availability and Performance</h2>
              <p className="mb-4 text-gray-300">
                While we strive to provide reliable service, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Service availability may be affected by maintenance, updates, or technical issues</li>
                <li>Third-party platform changes (Meta, Shopify) may impact functionality temporarily</li>
                <li>AI processing times may vary based on data complexity and system load</li>
                <li>We provide the service "as is" without warranties regarding uptime or performance</li>
                <li>Data sync delays may occur due to API rate limits or platform restrictions</li>
                <li>We reserve the right to modify or discontinue features with reasonable notice</li>
                <li><strong>Platform Connection Monitoring:</strong> We monitor connection status but cannot guarantee third-party platform availability</li>
                <li><strong>AI Feature Limitations:</strong> Daily usage limits may restrict AI consultations to ensure fair access for all users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">9. Limitation of Liability</h2>
              <p className="mb-4 text-gray-300">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. This includes but is not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Loss of profits, revenue, data, or business opportunities</li>
                <li>Marketing campaign failures or poor performance based on AI recommendations</li>
                <li>Service interruptions, computer failures, or data loss</li>
                <li>Changes to third-party platform terms, functionality, or pricing</li>
                <li>Actions taken by third-party platforms regarding your accounts or campaigns</li>
                <li>Inaccuracies in AI-generated insights, reports, or recommendations</li>
                <li>Lead generation results or the quality of leads discovered through our tools</li>
                <li>Compliance issues arising from the use of generated content or recommendations</li>
                <li><strong>Industry Niche Misclassification:</strong> Impacts from incorrect business niche information or industry categorization</li>
                <li><strong>Platform Connection Issues:</strong> Data loss or campaign disruption due to expired or failed platform connections</li>
                <li><strong>AI Usage Limitations:</strong> Business impact from daily AI consultation limits or feature restrictions</li>
              </ul>
              <p className="mb-4 text-gray-300">
                Our total liability to you for any claims related to the service shall not exceed the amount paid by you for the service in the twelve months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">10. Subscription and Payment Terms</h2>
              <p className="mb-4 text-gray-300">
                If applicable to your use of the service:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Subscription fees are charged in advance and are non-refundable unless required by law</li>
                <li>We may modify pricing with 30 days' advance notice to existing subscribers</li>
                <li>Failed payments may result in service suspension until payment is resolved</li>
                <li>You are responsible for all taxes and fees associated with your use of the service</li>
                <li>Enterprise and custom plans may have additional terms specified in separate agreements</li>
                <li><strong>Feature Access:</strong> Certain AI features and usage limits may vary by subscription tier</li>
                <li><strong>Platform Connections:</strong> Some integrations may require higher-tier subscriptions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">11. Termination</h2>
              <p className="mb-4 text-gray-300">
                We may terminate or suspend your account and access to our service immediately, without prior notice or liability, for any reason, including but not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Breach of these Terms of Service</li>
                <li>Violation of third-party platform terms that affect our service provision</li>
                <li>Fraudulent, abusive, or illegal use of the service</li>
                <li>Non-payment of applicable fees</li>
                <li>Request for account deletion or extended inactivity</li>
                <li><strong>AI Misuse:</strong> Attempting to circumvent usage limits or misuse AI features</li>
                <li><strong>Data Violations:</strong> Inappropriate use of lead generation or customer data</li>
              </ul>
              <p className="mb-4 text-gray-300">
                Upon termination, your right to use the service will cease immediately. You may export your data before termination, and we will retain your data according to our Privacy Policy and applicable laws. Platform connections will be automatically disconnected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">12. Disclaimers and Warranties</h2>
              <p className="mb-4 text-gray-300">
                The service is provided on an "AS IS" and "AS AVAILABLE" basis. We expressly disclaim all warranties of any kind, whether express or implied, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
                <li>Guarantees regarding the accuracy, reliability, or completeness of AI-generated content</li>
                <li>Assurances of continuous, uninterrupted, or error-free service operation</li>
                <li>Warranties regarding the performance of marketing campaigns based on our recommendations</li>
                <li>Guarantees about the availability or stability of third-party platform integrations</li>
                <li><strong>Industry-Specific Accuracy:</strong> Warranties about the precision of niche-based recommendations or industry insights</li>
                <li><strong>Platform Connection Reliability:</strong> Guarantees about third-party platform connection stability or data sync accuracy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">13. Indemnification</h2>
              <p className="mb-4 text-gray-300">
                You agree to defend, indemnify, and hold harmless the Brez Marketing Platform, its affiliates, licensors, and service providers from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Your use of and access to the service</li>
                <li>Your violation of any term of these Terms</li>
                <li>Your violation of any third-party right, including without limitation any right of privacy or intellectual property rights</li>
                <li>Marketing campaigns or business decisions made based on AI recommendations</li>
                <li>Any claim that your use of the service caused damage to a third party</li>
                <li><strong>Industry Misrepresentation:</strong> Claims arising from inaccurate business niche information or industry categorization</li>
                <li><strong>Platform Integration Issues:</strong> Problems arising from your use of connected third-party platforms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">14. Changes to Terms</h2>
              <p className="mb-4 text-gray-300">
                We reserve the right to modify or replace these Terms at any time. We will provide reasonable notice of material changes through email notification or prominent platform notice. For significant changes affecting AI features, data processing, service functionality, or platform integrations, we will provide at least 30 days' advance notice. Your continued use of the service after such changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">15. Governing Law and Dispute Resolution</h2>
              <p className="mb-4 text-gray-300">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes relating to these Terms or the service shall be resolved through:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>First, good faith negotiations between the parties</li>
                <li>If negotiations fail, binding arbitration in accordance with the American Arbitration Association rules</li>
                <li>Court proceedings only for disputes involving intellectual property rights or injunctive relief</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">16. Industry-Specific Considerations</h2>
              <p className="mb-4 text-gray-300">
                We acknowledge that different industries may have specific requirements and considerations:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Healthcare & Medical:</strong> Our service does not provide medical advice or handle PHI; users must ensure HIPAA compliance independently</li>
                <li><strong>Financial Services:</strong> Our recommendations do not constitute financial advice; users must comply with applicable financial regulations</li>
                <li><strong>Legal & Professional Services:</strong> Our content does not constitute legal advice; professional compliance remains user responsibility</li>
                <li><strong>E-commerce:</strong> Users are responsible for product liability, customer service, and transaction processing compliance</li>
                <li><strong>Local Services:</strong> Users must comply with local licensing, bonding, and service area regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">17. Severability and Entire Agreement</h2>
              <p className="mb-4 text-gray-300">
                If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall be enforced. These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the use of the service and supersede all prior agreements and understandings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">18. Contact Information</h2>
              <p className="mb-4 text-gray-300">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                <p className="mb-2 text-gray-300">
                  <strong>Email:</strong> <a href="mailto:tbehrens121@gmail.com" className="text-blue-400 hover:text-blue-300 underline">
                    tbehrens121@gmail.com
                  </a>
                </p>
                <p className="text-gray-300">
                  <strong>Subject Line:</strong> Terms of Service Inquiry - Brez Marketing Platform
                </p>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                We will respond to your terms-related inquiries within 30 days of receipt. For urgent legal matters, please include "URGENT" in your subject line.
              </p>
            </section>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
} 