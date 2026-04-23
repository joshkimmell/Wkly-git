import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import Logo from '@components/Logo';

const EFFECTIVE_DATE = 'April 27, 2026';

const TermsContent: React.FC = () => (
  <div className="space-y-4 text-sm text-secondary-text leading-relaxed">
    <h1 className="text-2xl font-serif text-primary mb-4">Terms &amp; Conditions</h1>
    <p>These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the Wkly application and website located at wkly.me (collectively, the &quot;Service&quot;), operated by Wkly (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

    <h3 className="font-bold text-primary-text">1. Eligibility</h3>
    <p>You must be at least 13 years of age to use the Service. By using the Service, you represent and warrant that you meet this requirement and have the legal capacity to enter into these Terms.</p>

    <h3 className="font-bold text-primary-text">2. Account Registration</h3>
    <p>To access certain features, you must create an account using a valid email address. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.</p>

    <h3 className="font-bold text-primary-text">3. Acceptable Use</h3>
    <p>You agree not to: (a) use the Service for any unlawful purpose or in violation of any applicable law; (b) attempt to gain unauthorized access to any part of the Service or its related systems; (c) transmit any malicious code, viruses, or harmful content; (d) interfere with or disrupt the integrity or performance of the Service; or (e) use the Service to harass, abuse, or harm others.</p>

    <h3 className="font-bold text-primary-text">4. User Content</h3>
    <p>You retain ownership of all content you submit, post, or display through the Service (&quot;User Content&quot;), including goals, tasks, notes, summaries, and affirmations. By submitting User Content, you grant us a limited, non-exclusive license to store, process, and display your content solely as necessary to provide the Service to you. We do not claim ownership of your User Content.</p>

    <h3 className="font-bold text-primary-text">5. AI-Generated Content</h3>
    <p>The Service may use artificial intelligence to generate content such as affirmations, summaries, and suggestions. AI-generated content is provided &quot;as is&quot; for informational and entertainment purposes only, and should not be relied upon as professional, medical, legal, or financial advice. We make no warranties regarding the accuracy, completeness, or suitability of AI-generated content.</p>

    <h3 className="font-bold text-primary-text">6. Intellectual Property</h3>
    <p>The Service, including its design, logos, software, and all related intellectual property, is owned by Wkly and protected by United States and international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, distribute, or create derivative works from any part of the Service without our prior written consent.</p>

    <h3 className="font-bold text-primary-text">7. Termination</h3>
    <p>We reserve the right to suspend or terminate your account and access to the Service at our sole discretion, with or without notice, for conduct that we determine violates these Terms or is otherwise harmful to the Service or other users. Upon termination, your right to use the Service will cease immediately.</p>

    <h3 className="font-bold text-primary-text">8. Disclaimer of Warranties</h3>
    <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>

    <h3 className="font-bold text-primary-text">9. Limitation of Liability</h3>
    <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WKLY, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>

    <h3 className="font-bold text-primary-text">10. Indemnification</h3>
    <p>You agree to indemnify, defend, and hold harmless Wkly and its affiliates, officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to your use of the Service, your User Content, or your violation of these Terms.</p>

    <h3 className="font-bold text-primary-text">11. Governing Law &amp; Dispute Resolution</h3>
    <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be resolved exclusively in the state or federal courts located in Los Angeles County, California, and you consent to the personal jurisdiction of such courts.</p>

    <h3 className="font-bold text-primary-text">12. Changes to These Terms</h3>
    <p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on the Service with a revised effective date. Your continued use of the Service after such changes constitutes your acceptance of the revised Terms.</p>

    <h3 className="font-bold text-primary-text">13. Subscriptions &amp; Refunds</h3>
    <p><strong>Billing.</strong> Wkly offers a free tier and a paid Pro subscription billed on a monthly or annual basis. Subscription fees are charged in advance at the start of each billing period. All prices are in US dollars unless otherwise stated.</p>
    <p><strong>Cancellation.</strong> You may cancel your Pro subscription at any time through your account settings or by contacting us at support@wkly.me. Cancellation takes effect at the end of the current billing period; you will retain access to Pro features until that date and will not be charged again thereafter. We do not provide prorated refunds for unused time within a billing period.</p>
    <p><strong>Refunds — Web (Stripe).</strong> Annual subscriptions purchased directly on wkly.me are eligible for a full refund if requested within 14 days of the initial purchase date, provided you have not made substantial use of paid features during that period. Monthly subscriptions are non-refundable. To request a refund, contact us at support@wkly.me with your account email and reason for the request.</p>
    <p><strong>Refunds — Apple App Store.</strong> Purchases made through the Apple App Store are subject to Apple&apos;s refund policies. We have no ability to issue refunds for App Store transactions; all such requests must be submitted directly to Apple at <a href="https://reportaproblem.apple.com" className="text-brand-60 dark:text-brand-30 underline" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>.</p>
    <p><strong>Refunds — Google Play.</strong> Purchases made through Google Play are subject to Google&apos;s refund policies. Refund requests for Google Play transactions must be submitted directly to Google Play support.</p>
    <p><strong>Price Changes.</strong> We reserve the right to change subscription pricing with at least 30 days&apos; advance notice. Continued use of the Service after a price change takes effect constitutes your acceptance of the new pricing.</p>

    <h3 className="font-bold text-primary-text">14. Contact</h3>
    <p>If you have questions about these Terms, please contact us at <span className="text-brand-60 dark:text-brand-30">support@wkly.me</span>.</p>
  </div>
);

const PrivacyContent: React.FC = () => (
  <div className="space-y-4 text-sm text-secondary-text leading-relaxed">
    <h1 className="text-2xl font-serif text-primary mb-4">Privacy Policy</h1>
    <p>This Privacy Policy (&quot;Policy&quot;) describes how Wkly (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, and protects your personal information when you use the Wkly application and website at wkly.me (the &quot;Service&quot;). By using the Service, you consent to the practices described in this Policy.</p>

    <h3 className="font-bold text-primary-text">1. Information We Collect</h3>
    <p><strong>Account Information:</strong> When you register, we collect your email address and any profile information you choose to provide (such as a display name and avatar).</p>
    <p><strong>User Content:</strong> We store the content you create within the Service, including goals, tasks, notes, summaries, affirmations, and focus session data.</p>
    <p><strong>Usage Data:</strong> We may collect anonymized, aggregated information about how you interact with the Service (e.g., feature usage, page views) to improve the product. This data cannot be used to identify you personally.</p>
    <p><strong>Device &amp; Browser Data:</strong> We may collect basic technical information such as browser type, operating system, and timezone to optimize your experience.</p>

    <h3 className="font-bold text-primary-text">2. How We Use Your Information</h3>
    <p>We use your information solely to: (a) provide, maintain, and improve the Service; (b) authenticate your identity and secure your account; (c) generate AI-powered features such as summaries and affirmations; (d) send transactional communications (e.g., magic login links, task reminders) that you have opted into; and (e) comply with legal obligations.</p>

    <h3 className="font-bold text-primary-text">3. Data Security &amp; Encryption</h3>
    <p>We take the security of your data seriously. All data transmitted between your browser and our servers is encrypted using industry-standard TLS (Transport Layer Security) encryption. Your data is stored in secure, access-controlled databases with encryption at rest. We use Supabase, which provides enterprise-grade security including Row Level Security (RLS) policies ensuring that only you can access your own data. Authentication tokens are handled securely and are never stored in plaintext.</p>

    <h3 className="font-bold text-primary-text">4. We Do Not Sell Your Data</h3>
    <p><strong>Your personal information and User Content will never be sold, rented, traded, or otherwise shared with third parties for their marketing or commercial purposes.</strong> This is a core commitment of our Service.</p>

    <h3 className="font-bold text-primary-text">5. Third-Party Services</h3>
    <p>We use a limited number of trusted third-party service providers to operate the Service:</p>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Supabase</strong> — authentication and database hosting (your data is stored securely with encryption at rest and in transit)</li>
      <li><strong>Netlify</strong> — application hosting and serverless functions</li>
      <li><strong>OpenAI</strong> — AI-generated content such as affirmations and summaries (content sent to OpenAI is used only to generate your response and is not used to train their models per our API agreement)</li>
    </ul>
    <p>These providers are contractually obligated to protect your data and may only process it on our behalf and in accordance with our instructions.</p>

    <h3 className="font-bold text-primary-text">6. Data Retention</h3>
    <p>We retain your personal information and User Content for as long as your account is active or as needed to provide you with the Service. If you request account deletion, we will permanently delete your data within 30 days, except where retention is required by law.</p>

    <h3 className="font-bold text-primary-text">7. Your Rights</h3>
    <p>You have the right to: (a) access and review the personal information we hold about you; (b) correct inaccurate information; (c) request deletion of your account and associated data; and (d) export your User Content. To exercise any of these rights, contact us at <span className="text-brand-60 dark:text-brand-30">support@wkly.me</span>.</p>

    <h3 className="font-bold text-primary-text">8. California Privacy Rights (CCPA)</h3>
    <p>If you are a California resident, you have the right to: (a) know what personal information we collect and how it is used; (b) request deletion of your personal information; (c) opt out of the sale of personal information (we do not sell your data); and (d) not be discriminated against for exercising your privacy rights. To make a verifiable consumer request, contact us at <span className="text-brand-60 dark:text-brand-30">support@wkly.me</span>.</p>

    <h3 className="font-bold text-primary-text">9. GDPR — European &amp; UK Users</h3>
    <p>If you are located in the European Economic Area (EEA) or United Kingdom, additional rights apply to you under the General Data Protection Regulation (GDPR) or UK GDPR:</p>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Legal basis for processing.</strong> We process your personal data on the following legal bases: (a) <em>contract performance</em> — to provide the Service you signed up for; (b) <em>legitimate interests</em> — to maintain security, prevent fraud, and improve the Service; and (c) <em>consent</em> — where you have explicitly opted in (e.g., task reminders).</li>
      <li><strong>Your rights.</strong> You have the right to access, rectify, erase, restrict, or object to the processing of your personal data, and the right to data portability. To exercise any of these rights, contact us at <span className="text-brand-60 dark:text-brand-30">support@wkly.me</span>. We will respond within 30 days.</li>
      <li><strong>Data transfers.</strong> Your data is stored and processed in the United States. By using the Service, you acknowledge that your data may be transferred to and processed in the US, which may not provide the same level of data protection as your home country. We rely on standard contractual clauses and our processors&apos; data processing agreements to safeguard such transfers.</li>
      <li><strong>Cookies &amp; consent.</strong> We do not use advertising or tracking cookies. We use browser local/session storage solely for functional purposes (theme preference, session state). No consent banner is required for strictly necessary storage; however, if we introduce optional analytics cookies in the future, we will obtain your consent before placing them.</li>
      <li><strong>Right to lodge a complaint.</strong> You have the right to lodge a complaint with your local data protection authority (e.g., the ICO in the UK, or your national supervisory authority in the EEA).</li>
    </ul>

    <h3 className="font-bold text-primary-text">10. Children&apos;s Privacy</h3>
    <p>The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete that information promptly.</p>

    <h3 className="font-bold text-primary-text">11. Cookies &amp; Local Storage</h3>
    <p>We use browser local storage and session storage to maintain your preferences (such as theme selection and session state). We do not use third-party tracking cookies or advertising cookies.</p>

    <h3 className="font-bold text-primary-text">12. Changes to This Policy</h3>
    <p>We may update this Policy from time to time. We will notify you of material changes by posting the updated Policy on the Service with a revised effective date. Your continued use of the Service after such changes constitutes your acceptance of the revised Policy.</p>

    <h3 className="font-bold text-primary-text">13. Contact</h3>
    <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us at <span className="text-brand-60 dark:text-brand-30">support@wkly.me</span>.</p>
  </div>
);

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="w-full bg-background-color border-t border-brand-20 dark:border-brand-80 mt-16 mb-10 md:mb-0 pt-4 pb-12 md:pt-8 md:pb-8 px-4 sm:px-8 lg:px-16">
        <div className="max-w-8xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Logo useTheme className="h-5 w-auto" />
          </div>

          <p className="text-xs p-0 text-secondary-text">
            &copy; {year} Wkly. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <button
              // onClick={() => setTermsOpen(true)}
              onClick={() => { window.location.href = '/terms'; }}
              className="btn-link cursor-pointer"
            >
              Terms
            </button>
            <button
              // onClick={() => setPrivacyOpen(true)}
              onClick={() => { window.location.href = '/privacy'; }}
              className="btn-link cursor-pointer"
            >
              Privacy
            </button>
          </div>
        </div>
      </footer>

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsOpen} onClose={() => setTermsOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle className="flex items-center justify-between">
          <span>Terms &amp; Conditions</span>
          <IconButton onClick={() => setTermsOpen(false)} size="small" aria-label="Close">
            <X className="w-5 h-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <p className="text-xs text-secondary-text/60 mb-4">Effective Date: {EFFECTIVE_DATE}</p>
          <TermsContent />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTermsOpen(false)} className="!normal-case">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle className="flex items-center justify-between">
          <span>Privacy Policy</span>
          <IconButton onClick={() => setPrivacyOpen(false)} size="small" aria-label="Close">
            <X className="w-5 h-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <p className="text-xs text-secondary-text/60 mb-4">Effective Date: {EFFECTIVE_DATE}</p>
          <PrivacyContent />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyOpen(false)} className="!normal-case">Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Footer;
export { TermsContent, PrivacyContent, EFFECTIVE_DATE };
