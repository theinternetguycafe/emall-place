import { Helmet } from 'react-helmet-async'

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | eMall Place Collective</title>
      </Helmet>
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-stone-500 font-medium mb-12">Last updated: July 2026</p>
        <div className="prose prose-stone max-w-none space-y-6 text-stone-600 leading-relaxed">
          <p>By using eMall Place Collective you agree to these Terms of Service. Please read them carefully before using the platform.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">Platform Use</h2>
          <p>eMall Place is a marketplace connecting buyers and sellers. All transactions are between buyers and individual sellers. eMall Place facilitates but is not a party to these transactions.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">Seller Obligations</h2>
          <p>Sellers must complete KYC verification, list only legitimate products, and honour all confirmed orders. eMall Place reserves the right to remove listings or suspend accounts that violate these terms.</p>
          <h2 className="text-xl font-black text-slate-900 mt-8">Contact Us</h2>
          <p>For legal enquiries, contact us at legal@emallplace.co.za.</p>
        </div>
      </div>
    </>
  )
}
