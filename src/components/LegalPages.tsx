import { motion } from 'motion/react';
import { Shield, Lock, FileText, ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  onBack: () => void;
}

export function TermsOfService({ onBack }: LegalPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 font-medium mb-8 hover:underline"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>
      
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-400 italic">Last Updated: April 12, 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TalentFabric (talentfabric.eu), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Use License</h2>
            <p>
              TalentFabric grants you a personal, non-exclusive, non-transferable license to use the platform for professional networking and recruitment purposes. You may not:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose other than recruitment;</li>
              <li>Attempt to decompile or reverse engineer any software contained on TalentFabric;</li>
              <li>Remove any copyright or other proprietary notations from the materials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. TalentFabric reserves the right to refuse service, terminate accounts, or remove content at its sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Professional Conduct</h2>
            <p>
              Users must interact in a professional and respectful manner. Harassment, spamming, or the use of the platform for non-professional purposes is strictly prohibited and may result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Disclaimer</h2>
            <p>
              The materials on TalentFabric are provided on an 'as is' basis. TalentFabric makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

export function PrivacyPolicy({ onBack }: LegalPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 font-medium mb-8 hover:underline"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>
      
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Shield size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-400 italic">Last Updated: April 12, 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create a profile, update your skills, or communicate with other users. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and contact information (via Google Auth);</li>
              <li>Professional experience, headline, and bio;</li>
              <li>Skills and expertise;</li>
              <li>Communication history within the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. GDPR Compliance</h2>
            <p>
              In accordance with the General Data Protection Regulation (GDPR), we provide the following rights to all users:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right to Access:</strong> You can view all data we store about you in your dashboard.</li>
              <li><strong>Right to Rectification:</strong> You can update your profile information at any time.</li>
              <li><strong>Right to Erasure:</strong> You can delete your account and all associated data permanently.</li>
              <li><strong>Right to Data Portability:</strong> You can export your data in a machine-readable JSON format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, including connecting professionals with recruiters and facilitating secure communication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

export function CookiePolicy({ onBack }: LegalPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-indigo-600 font-medium mb-8 hover:underline"
      >
        <ArrowLeft size={20} /> Back to Home
      </button>
      
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Cookie Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-400 italic">Last Updated: April 12, 2026</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">What are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">How We Use Cookies</h2>
            <p>
              TalentFabric uses cookies for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication:</strong> We use cookies to keep you signed in as you move through the platform.</li>
              <li><strong>Preferences:</strong> We use cookies to remember your settings and preferences, such as your visibility mode.</li>
              <li><strong>Analytics:</strong> We may use cookies to understand how users interact with our platform to improve the user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Managing Cookies</h2>
            <p>
              Most web browsers allow you to control cookies through their settings. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, as it will no longer be personalized to you.
            </p>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
