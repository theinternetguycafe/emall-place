import { Helmet } from 'react-helmet-async'

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | eMall Place Collective</title>
      </Helmet>
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-stone-500 font-medium mb-12">Last updated: July 2026</p>
        <div className="prose prose-stone max-w-none space-y-6 text-stone-600 leading-relaxed">
          <p>eMall Place Collective respects your privacy and is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data when you use our platform.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, and payment details when you register or make a purchase. We also collect usage data to improve the platform experience.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">How We Use Your Information</h2>
          <p>Your information is used to process orders, communicate with you about your account, and improve our services. We do not sell your personal data to third parties.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">Contact Us</h2>
          <p>For privacy concerns, contact us at privacy@emallplace.co.za.</p>
        </div>
      </div>
    </>
  )
}
