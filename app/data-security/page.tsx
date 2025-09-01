import { GridOverlay } from "@/components/GridOverlay"

export default function DataSecurity() {
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
                <a href="/privacy" className="block px-3 py-2 rounded-lg text-gray-400 hover:bg-[#333] hover:text-white transition-colors">
                  Privacy Policy
                </a>
                <a href="/data-security" className="block px-3 py-2 rounded-lg bg-[#333] text-white font-medium">
                  Data Security
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 pl-8">
            <h1 className="text-3xl font-bold text-white mb-8">Data Security & Protection</h1>

            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-8 rounded-lg border border-[#333] text-white shadow-xl">
          <div className="prose max-w-none">
            <p className="mb-6 text-sm text-gray-400">
              Last updated: December 17, 2024
            </p>

            <div className="mb-8 p-6 bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-700/30 rounded-lg">
              <h2 className="text-xl font-semibold mb-3 text-green-400 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Our Security Promise
              </h2>
              <p className="text-green-100 text-sm leading-relaxed">
                At Brez Marketing, we implement enterprise-grade security measures to protect your business data, marketing insights, and personal information. Your trust is our foundation, and we're committed to maintaining the highest standards of data protection.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                1. Infrastructure Security
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🏗️ Enterprise-Grade Infrastructure</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Supabase Database:</strong> PostgreSQL with built-in encryption at rest and in transit, hosted on AWS with SOC 2 Type II compliance</li>
                    <li><strong>Vercel Hosting:</strong> Edge computing with automatic HTTPS, DDoS protection, and global CDN distribution</li>
                    <li><strong>Row Level Security (RLS):</strong> Database-level access controls ensuring users can only access their own data</li>
                    <li><strong>Multi-Region Backup:</strong> Automated daily backups stored across multiple geographic regions</li>
                    <li><strong>Uptime Monitoring:</strong> 99.9% availability with real-time system health monitoring</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                2. Authentication & Access Control
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🔐 Multi-Layer Authentication</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Clerk Authentication:</strong> Enterprise-grade identity management with OAuth 2.0 and OpenID Connect standards</li>
                    <li><strong>Multi-Factor Authentication (MFA):</strong> Optional 2FA support for enhanced account security</li>
                    <li><strong>Session Management:</strong> Secure JWT tokens with automatic rotation and expiration handling</li>
                    <li><strong>Role-Based Access Control:</strong> Granular permissions for agency teams and brand sharing</li>
                    <li><strong>API Route Protection:</strong> Every API endpoint validates user authentication and authorization</li>
                    <li><strong>Production Security:</strong> Debug and admin endpoints automatically blocked in production environments</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                </svg>
                3. Data Encryption & Storage
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🔒 End-to-End Encryption</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Data in Transit:</strong> All communications encrypted with TLS 1.3 (256-bit encryption)</li>
                    <li><strong>Data at Rest:</strong> AES-256 encryption for all stored data, including databases and file storage</li>
                    <li><strong>API Credentials:</strong> Platform tokens and sensitive keys encrypted using industry-standard algorithms</li>
                    <li><strong>Password Security:</strong> Passwords hashed using bcrypt with unique salts (handled by Clerk)</li>
                    <li><strong>File Uploads:</strong> Images and documents encrypted during storage and transmission</li>
                    <li><strong>Database Encryption:</strong> PostgreSQL transparent data encryption (TDE) for all database files</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                4. Platform Integration Security
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🔗 Secure Third-Party Connections</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>OAuth 2.0 Authentication:</strong> Industry-standard authorization for Meta and Shopify connections</li>
                    <li><strong>Token Rotation:</strong> Meta tokens automatically expire every 60 days with proactive renewal notifications</li>
                    <li><strong>Scoped Permissions:</strong> Minimal access rights requested - only data necessary for analytics</li>
                    <li><strong>Secure Token Storage:</strong> All platform tokens encrypted and stored with access controls</li>
                    <li><strong>Connection Monitoring:</strong> Real-time monitoring of platform connection health and security status</li>
                    <li><strong>Revocation Controls:</strong> Instant disconnection capability with complete token invalidation</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                5. AI & Data Processing Security
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🤖 Responsible AI Processing</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Data Minimization:</strong> AI processes only necessary data for generating insights and recommendations</li>
                    <li><strong>Confidentiality Agreements:</strong> All AI service providers bound by strict data protection contracts</li>
                    <li><strong>No Training Data:</strong> Your business data is never used to train AI models or shared with other users</li>
                    <li><strong>Processing Isolation:</strong> Each user's AI processing runs in isolated environments</li>
                    <li><strong>Audit Logs:</strong> Complete logging of all AI interactions and data processing activities</li>
                    <li><strong>Usage Limits:</strong> Rate limiting prevents abuse and ensures fair resource allocation</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                6. Privacy & Data Control
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">👤 User Privacy Rights</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Data Ownership:</strong> You retain full ownership of all your business data and marketing insights</li>
                    <li><strong>Access Controls:</strong> Complete control over who can access your brands and data</li>
                    <li><strong>Data Portability:</strong> Export your data in standard formats at any time</li>
                    <li><strong>Right to Deletion:</strong> "Clear All Data" feature for immediate data removal</li>
                    <li><strong>Consent Management:</strong> Granular control over data processing and AI features</li>
                    <li><strong>Transparency:</strong> Clear logging of all data access and processing activities</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                7. Compliance & Standards
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">📋 Regulatory Compliance</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>GDPR Compliance:</strong> Full compliance with European data protection regulations</li>
                    <li><strong>CCPA Compliance:</strong> California Consumer Privacy Act adherence for US users</li>
                    <li><strong>SOC 2 Type II:</strong> Infrastructure providers maintain SOC 2 compliance</li>
                    <li><strong>Meta Platform Policy:</strong> Full compliance with Facebook Platform Terms and Data Use Policy</li>
                    <li><strong>Shopify Partner Standards:</strong> Adherence to Shopify Partner Program security requirements</li>
                    <li><strong>Data Retention Policies:</strong> Clear data retention schedules with automatic purging</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                8. Incident Response & Monitoring
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🚨 Proactive Security Monitoring</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>24/7 Monitoring:</strong> Continuous monitoring of system security and performance</li>
                    <li><strong>Automated Threat Detection:</strong> Real-time identification of suspicious activities</li>
                    <li><strong>Incident Response Plan:</strong> Documented procedures for security incident handling</li>
                    <li><strong>Security Logging:</strong> Comprehensive audit trails for all system access and changes</li>
                    <li><strong>Breach Notification:</strong> Immediate notification protocols if security incidents occur</li>
                    <li><strong>Regular Security Audits:</strong> Periodic penetration testing and vulnerability assessments</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                9. Your Security Responsibilities
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🤝 Shared Security Model</h3>
                  <p className="text-gray-300 mb-3">While we handle infrastructure security, you play a crucial role in maintaining security:</p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Strong Passwords:</strong> Use complex, unique passwords for your account</li>
                    <li><strong>Account Security:</strong> Enable MFA and keep your contact information updated</li>
                    <li><strong>Team Access:</strong> Only grant platform access to trusted team members</li>
                    <li><strong>Connection Management:</strong> Regularly review and update platform connections</li>
                    <li><strong>Data Classification:</strong> Be mindful of the sensitivity of data you connect</li>
                    <li><strong>Incident Reporting:</strong> Report any suspicious activity immediately</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                10. Security Certifications & Partnerships
              </h2>
              <div className="space-y-4">
                <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                  <h3 className="text-lg font-medium text-white mb-2">🏆 Trusted Technology Partners</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    <li><strong>Clerk:</strong> SOC 2 Type II certified authentication provider trusted by thousands of companies</li>
                    <li><strong>Supabase:</strong> SOC 2 compliant with encryption at rest and in transit, hosted on AWS</li>
                    <li><strong>Vercel:</strong> Enterprise-grade hosting with built-in DDoS protection and global edge network</li>
                    <li><strong>OpenAI:</strong> Leading AI provider with comprehensive privacy and security controls</li>
                    <li><strong>Meta Business API:</strong> Official Facebook/Instagram API with platform-level security</li>
                    <li><strong>Shopify Partners:</strong> Certified Shopify partner following platform security standards</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">🔍 Transparency & Accountability</h2>
              <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-700/30 rounded-lg p-6">
                <p className="text-blue-100 text-sm leading-relaxed mb-4">
                  We believe in complete transparency about our security practices. If you have specific security questions or require additional compliance documentation for your organization, we're happy to provide detailed information.
                </p>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Our security measures are continuously evolving. We regularly review and update our practices to stay ahead of emerging threats and maintain the highest standards of data protection for your business.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">📞 Security Contact & Reporting</h2>
              <p className="mb-4 text-gray-300">
                For security-related inquiries, concerns, or to report potential vulnerabilities:
              </p>
              <div className="bg-[#0f0f0f] p-4 rounded-lg border border-[#333]">
                <p className="mb-2 text-gray-300">
                  <strong>Security Email:</strong> <a href="mailto:tbehrens121@gmail.com" className="text-blue-400 hover:text-blue-300 underline">
                    tbehrens121@gmail.com
                  </a>
                </p>
                <p className="text-gray-300 mb-3">
                  <strong>Subject Line:</strong> SECURITY - [Brief Description]
                </p>
                <p className="text-sm text-gray-400">
                  For urgent security matters, please include "URGENT" in your subject line. We commit to responding to all security inquiries within 24 hours.
                </p>
              </div>
            </section>

            <div className="mt-8 p-6 bg-gradient-to-r from-gray-800/20 to-gray-700/20 border border-gray-600/30 rounded-lg">
              <p className="text-sm text-gray-300 leading-relaxed">
                This Data Security documentation is reviewed and updated regularly to reflect our current security practices and compliance requirements. Last security review: December 17, 2024.
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
