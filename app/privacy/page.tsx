import { GridOverlay } from "@/components/GridOverlay"

export default function PrivacyPolicy() {
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
                <a href="/terms" className="block px-3 py-2 rounded-lg text-gray-400 hover:bg-[#333] hover:text-white transition-colors">
                  Terms of Service
                </a>
                <a href="/privacy" className="block px-3 py-2 rounded-lg bg-[#333] text-white font-medium">
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
            <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>

            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-8 rounded-lg border border-[#333] text-white shadow-xl">
          <div className="prose max-w-none">
            <p className="mb-6 text-sm text-gray-400">
              Last updated: August 13, 2025
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">1. Information We Collect</h2>
              <p className="mb-4 text-gray-300">
                We collect information that you provide directly to us when using the Brez Marketing Platform, including:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Account information (name, email address, authentication credentials)</li>
                <li>Brand information (brand names, logos, business niches, industry categories)</li>
                <li>Meta (Facebook) Ads account data, metrics, and campaign information</li>
                <li>Shopify store data, customer information, order history, and analytics</li>
                <li>Platform connection tokens and authentication data</li>
                <li>AI interaction data (prompts, preferences, and usage patterns)</li>
                <li>Agency settings and digital signatures for contract generation</li>
                <li>Lead generation data and contact information</li>
                <li>Usage analytics and platform interaction data</li>
                <li>Marketing goal preferences and campaign optimization selections</li>
                <li>Custom brand niche specifications and industry categorizations</li>
                <li>Ad creative generation data and image processing for background generation</li>
                <li>Outreach tool contact data and communication templates</li>
                <li>Brand report generation preferences and automated scheduling</li>
                <li>User feedback submissions and platform improvement suggestions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">2. AI-Powered Features and Data Processing</h2>
              <p className="mb-4 text-gray-300">
                Our platform uses artificial intelligence to enhance your marketing experience:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Marketing Assistant:</strong> AI analyzes your campaign data to provide personalized recommendations, insights, and strategic advice based on your brand's niche and performance metrics</li>
                <li><strong>Campaign Analysis:</strong> Automated analysis of advertising performance, ROI calculations, and optimization suggestions</li>
                <li><strong>Creative Recommendations:</strong> AI-powered suggestions for ad creatives, copy improvements, and audience targeting</li>
                <li><strong>Lead Scoring:</strong> Intelligent scoring and prioritization of leads based on multiple data points</li>
                <li><strong>Report Generation:</strong> Automated creation of marketing reports and performance summaries</li>
                <li><strong>Smart Insights:</strong> Pattern recognition in your data to identify trends and opportunities</li>
                <li><strong>Industry-Specific Recommendations:</strong> AI uses your brand niche information to provide targeted advice specific to your industry vertical</li>
                <li><strong>Goal-Oriented Optimization:</strong> AI tailors recommendations based on your selected marketing objectives (lead generation, brand awareness, product launches, etc.)</li>
                <li><strong>Predictive Analytics:</strong> AI models predict campaign performance and suggest optimal budget allocations</li>
                <li><strong>Ad Creative Generation:</strong> AI-powered background generation and image processing for marketing materials</li>
                <li><strong>AI Marketing Consultant:</strong> Real-time conversational AI that provides brand and agency-wide marketing insights</li>
                <li><strong>Automated Outreach:</strong> AI-assisted lead outreach templates and contact management</li>
                <li><strong>Brand Report Automation:</strong> AI-generated comprehensive brand performance reports with customizable scheduling</li>
              </ul>
              <p className="mb-4 text-gray-300">
                Your brand niche information is specifically used to tailor AI recommendations to your industry, ensuring more relevant and actionable insights for businesses in landscaping, roofing, e-commerce, healthcare, and other specialized sectors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">3. Third-Party Platform Data</h2>
              <p className="mb-4 text-gray-300">
                Our service integrates with third-party platforms to provide comprehensive marketing analytics:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Meta (Facebook/Instagram):</strong> We access advertising metrics, campaign performance data, audience insights, and creative assets in accordance with Meta's Platform Terms and Data Policy. Data is retained for up to 90 days for analysis purposes. Platform connections automatically expire every 60 days for security compliance.</li>
                <li><strong>Shopify:</strong> We access store data including orders, customers, products, and analytics in accordance with Shopify's API Terms and Partner Program Agreement. This data is used to provide comprehensive business insights and customer analytics.</li>
                <li><strong>AI Processing:</strong> Your platform data may be processed by AI services to generate insights, but we do not share your raw business data with third-party AI providers beyond what's necessary for processing. All AI processing maintains strict data confidentiality.</li>
                <li><strong>Image Processing:</strong> Uploaded images for creative generation are processed through AI systems with automatic compression for optimal performance. Images are retained temporarily for processing and may be stored as part of your creative assets.</li>
                <li><strong>OpenAI Integration:</strong> Our platform uses OpenAI services for AI consultations and image generation, subject to OpenAI's usage policies and privacy practices.</li>
                <li><strong>Lead Generation Services:</strong> We collect and process publicly available business information for lead generation purposes, always in compliance with applicable data protection laws.</li>
              </ul>
              <p className="mb-4 text-gray-300">
                You have the right to disconnect these integrations at any time through your account settings. Upon disconnection, we will stop collecting new data from these platforms and can delete existing data upon request.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">4. How We Use Your Information</h2>
              <p className="mb-4 text-gray-300">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>Provide, maintain, and improve our marketing analytics and AI-powered services</li>
                <li>Process and display your marketing analytics and performance data</li>
                <li>Generate AI-powered insights, recommendations, and reports tailored to your business niche</li>
                <li>Create automated marketing reports and performance summaries</li>
                <li>Provide lead generation and customer acquisition tools</li>
                <li>Enable platform connections and data synchronization</li>
                <li>Personalize your dashboard experience and AI recommendations based on industry and goals</li>
                <li>Generate contracts and proposals with your agency branding</li>
                <li>Facilitate campaign optimization and budget recommendations</li>
                <li>Detect and prevent token expiration issues for seamless platform connectivity</li>
                <li>Provide industry-specific insights and benchmarking data</li>
                <li>Communicate with you about our services and important updates</li>
                <li>Protect against fraud, unauthorized access, and ensure platform security</li>
                <li>Comply with legal obligations and industry regulations</li>
                <li>Improve our AI models and recommendation algorithms (using aggregated, anonymized data only)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">5. Data Sharing and Disclosure</h2>
              <p className="mb-4 text-gray-300">
                We do not sell your personal information or business data to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li>With your explicit consent</li>
                <li>With service providers who process data on our behalf (including AI processing services) under strict confidentiality agreements</li>
                <li>With connected platforms (Meta, Shopify) as necessary to provide integration services</li>
                <li>To comply with legal obligations, court orders, or regulatory requirements</li>
                <li>To protect our rights, privacy, safety, or property, and that of our users</li>
                <li>In connection with a business transfer such as a merger, acquisition, or sale of assets</li>
                <li>Aggregated, anonymized data for industry research and platform improvement (no individual identification possible)</li>
                <li>With authentication providers (Clerk) for secure account management</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">6. Data Retention and Security</h2>
              <p className="mb-4 text-gray-300">
                We implement appropriate technical and organizational measures to protect your data:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Data Retention:</strong> Meta advertising data is retained for up to 90 days for analysis purposes. Other business data is retained for as long as your account is active or as needed to provide services.</li>
                <li><strong>Security Measures:</strong> We use encryption, secure authentication, regular security audits, and strict access controls to protect your data.</li>
                <li><strong>AI Data Processing:</strong> AI processing is conducted in secure environments with appropriate safeguards for sensitive business information. Brand niche data is used only for improving recommendation relevance.</li>
                <li><strong>Connection Management:</strong> Platform connections are monitored for expiration and security issues. You receive proactive notifications about token renewal requirements.</li>
                <li><strong>Access Controls:</strong> Strict access controls ensure only authorized personnel can access your data for legitimate business purposes.</li>
                <li><strong>Data Deletion:</strong> You can request deletion of your data at any time through the "Clear All Data" function in your settings or by contacting us directly.</li>
                <li><strong>Backup and Recovery:</strong> We maintain secure backups of your data to prevent loss while ensuring backup data follows the same security protocols.</li>
              </ul>
              <p className="mb-4 text-gray-300">
                While we strive to protect your personal information using industry-standard security measures, no method of transmission over the Internet or electronic storage is 100% secure. We maintain ongoing security practices, monitoring, and incident response procedures.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">7. Your Rights and Choices</h2>
              <p className="mb-4 text-gray-300">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Access:</strong> Request access to and obtain a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data through your account settings</li>
                <li><strong>Deletion:</strong> Request deletion of your data (available through settings or by contacting us)</li>
                <li><strong>Restriction:</strong> Object to or restrict certain processing of your data</li>
                <li><strong>Consent Withdrawal:</strong> Withdraw consent for data processing at any time</li>
                <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>AI Opt-out:</strong> Request exclusion from AI-powered features (though this may limit platform functionality)</li>
                <li><strong>Platform Disconnection:</strong> Disconnect third-party platforms at any time through your settings</li>
                <li><strong>Niche Data Control:</strong> Update or remove your brand niche information to control AI recommendation targeting</li>
                <li><strong>Marketing Goal Preferences:</strong> Modify your marketing objectives to change AI recommendation focus</li>
              </ul>
              <p className="mb-4 text-gray-300">
                To exercise these rights, please contact us using the information provided below or use the comprehensive data management tools available in your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">8. AI and Machine Learning</h2>
              <p className="mb-4 text-gray-300">
                Our AI-powered features are designed to enhance your marketing effectiveness:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Personalization:</strong> AI uses your brand niche, industry category, marketing goals, and historical performance to provide tailored recommendations</li>
                <li><strong>Data Processing:</strong> Your business data is processed to identify patterns, trends, and optimization opportunities specific to your industry</li>
                <li><strong>Model Training:</strong> We may use aggregated, anonymized data to improve our AI models, but never share individual business data or identifiable information</li>
                <li><strong>Human Oversight:</strong> AI recommendations are supplementary tools; final marketing decisions remain under your control</li>
                <li><strong>Accuracy Disclaimer:</strong> While our AI strives for accuracy, we recommend validating AI-generated insights with your business knowledge and industry expertise</li>
                <li><strong>Industry Specialization:</strong> AI recommendations are contextualized for your specific business niche, from local services to e-commerce, providing relevant industry insights</li>
                <li><strong>Usage Limitations:</strong> AI features include daily usage limits to ensure fair access and optimal performance for all users</li>
                <li><strong>Continuous Improvement:</strong> AI models are continuously updated to improve accuracy and relevance while maintaining data privacy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">9. International Data Transfers</h2>
              <p className="mb-4 text-gray-300">
                Your information may be transferred to, and processed in, countries other than the country in which you reside. These countries may have data protection laws that are different from your country. We have implemented appropriate safeguards, including standard contractual clauses, adequacy decisions, and secure processing agreements, to protect your personal information when transferred internationally.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">10. Children's Privacy</h2>
              <p className="mb-4 text-gray-300">
                Our services are intended for businesses and individuals aged 18 and older. We do not knowingly collect personal information from children under 13 (or the applicable age of digital consent in your jurisdiction). If we become aware that we have collected such information, we will take steps to delete it promptly and suspend the associated account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">11. Industry-Specific Data Handling</h2>
              <p className="mb-4 text-gray-300">
                We recognize that different industries have unique privacy and data handling requirements:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-300">
                <li><strong>Healthcare & Medical:</strong> We implement additional safeguards for healthcare-related businesses while not directly handling PHI</li>
                <li><strong>Financial Services:</strong> Enhanced security measures for businesses in financial sectors</li>
                <li><strong>E-commerce:</strong> Special considerations for customer transaction data and purchasing patterns</li>
                <li><strong>Local Services:</strong> Appropriate handling of location-based and service area information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">14. Changes to This Policy</h2>
              <p className="mb-4 text-gray-300">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. For significant changes affecting AI features, data processing, or your rights, we may provide additional notice through email or platform notifications. Your continued use of the service after such changes constitutes your acceptance of the new Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">13. Contact Us</h2>
              <p className="mb-4 text-gray-300">
                If you have any questions about this Privacy Policy, our data practices, or wish to exercise your privacy rights, please contact us at:
              </p>
              <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                <p className="mb-2 text-gray-300">
                  <strong>Email:</strong> <a href="mailto:tbehrens121@gmail.com" className="text-blue-400 hover:text-blue-300 underline">
                    tbehrens121@gmail.com
                  </a>
                </p>
                <p className="text-gray-300">
                  <strong>Subject Line:</strong> Privacy Policy Inquiry - Brez Marketing Platform
                </p>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                We will respond to your privacy-related inquiries within 30 days of receipt. For urgent privacy concerns, please include "URGENT" in your subject line.
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


