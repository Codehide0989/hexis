import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Hexagon, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const Pricing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Is HEXIS really anonymous?",
      a: "Yes. We don't collect emails, names, or IPs. Your identity is a cryptographic hash, making it mathematically impossible for us to trace the account back to you."
    },
    {
      q: "What happens if I lose my key?",
      a: "Because we use a zero-knowledge architecture, your master key is the only way to decrypt your data. If you lose it, your data remains encrypted forever. We cannot recover it."
    },
    {
      q: "Can I export my data?",
      a: "Yes. You can export your entire vault as an encrypted JSON blob at any time, or decrypt it locally before exporting."
    },
    {
      q: "How is payment handled?",
      a: "We accept cryptocurrencies for completely anonymous transactions, or standard payment methods processed by a third-party provider where only a payment token is stored, never linked to your identity hash."
    }
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="bg-[#0a1a0f] min-h-screen text-[#d8f3dc] font-sans pt-24 pb-24">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a1a0f]/90 backdrop-blur-sm border-b border-[#1b4332] h-14">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/hesixpng.png" alt="HEXIS" className="w-6 h-6 object-contain" />
            <span className="font-mono font-bold text-[#52b788] text-xl tracking-widest uppercase">HEXIS</span>
          </Link>
          <div className="flex items-center gap-4">
             <Link to="/" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">HOME</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6">
        <motion.div 
          initial="hidden" animate="visible" variants={fadeInUp}
          className="text-center mb-16"
        >
          <h1 className="font-mono font-bold text-4xl md:text-5xl text-[#d8f3dc] tracking-widest uppercase mb-4">RESOURCE_ALLOCATION</h1>
          <div className="w-24 h-1 bg-[#1b4332] mx-auto mb-6"></div>
          <p className="font-sans text-[#95d5b2] text-lg max-w-2xl mx-auto">
            Select the operational tier that fits your mission requirements. No hidden fees.
          </p>
        </motion.div>

        {/* PRICING CARDS */}
        <motion.div 
          initial="hidden" animate="visible" variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24"
        >
          {[
            { name: "COVERT", price: "0", desc: "For single operatives.", storage: "100MB", items: ["Tasks & Kanban", "Local Calendar", "Community Support"] },
            { name: "PHANTOM", price: "5", desc: "For serious professionals.", storage: "5GB", active: true, items: ["All Covert features", "Invoices & Finance", "Priority Syncing"] },
            { name: "APEX", price: "15", desc: "Maximum security tier.", storage: "50GB", items: ["All Phantom features", "Dedicated Node", "Direct Ops Support"] }
          ].map((tier, i) => (
            <motion.div key={i} variants={fadeInUp} className={`bg-[#0d2818] p-8 flex flex-col relative ${tier.active ? 'border-2 border-[#52b788]' : 'border border-[#1b4332]'}`}>
              {tier.active && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#52b788] text-[#0a1a0f] text-center font-mono text-xs py-1 px-3 tracking-widest uppercase font-bold whitespace-nowrap z-10">
                  RECOMMENDED
                </div>
              )}
              <div className={`mt-${tier.active ? '4' : '0'} flex-1`}>
                <h3 className="font-mono font-bold text-xl text-[#d8f3dc] tracking-widest mb-2 uppercase">{tier.name}</h3>
                <div className="font-mono font-bold text-4xl text-[#d8f3dc] mb-4">
                  <span className="text-xl text-[#52b788]">$</span>{tier.price}
                  <span className="text-sm font-normal text-[#2d6a4f] ml-1">/MO</span>
                </div>
                <p className="font-sans text-[#95d5b2] text-sm mb-6 pb-6 border-b border-[#1b4332]">{tier.desc}</p>
                <ul className="space-y-4 font-sans text-sm text-[#95d5b2] mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#52b788] shrink-0" /> 
                    <span>{tier.storage} Encrypted Storage</span>
                  </li>
                  {tier.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-[#52b788] shrink-0" /> 
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/signup" className={`block w-full text-center font-mono font-bold text-sm tracking-widest uppercase px-6 py-3 transition-colors duration-200 mt-auto ${tier.active ? 'bg-[#52b788] text-[#0a1a0f] hover:bg-[#74c69d]' : 'border border-[#52b788] text-[#52b788] hover:bg-[#52b788] hover:text-[#0a1a0f]'}`}>
                SELECT TIER
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div 
          initial="hidden" animate="visible" variants={fadeInUp}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="font-mono font-bold text-2xl text-[#d8f3dc] tracking-widest uppercase mb-4">FREQUENTLY ASKED QUESTIONS</h2>
            <div className="w-16 h-1 bg-[#1b4332] mx-auto"></div>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#0d2818] border border-[#1b4332] overflow-hidden">
                <button 
                  className="w-full text-left p-4 flex items-center justify-between font-mono font-bold text-sm text-[#d8f3dc] hover:text-[#52b788] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="uppercase">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="text-[#52b788]" /> : <ChevronDown size={16} className="text-[#52b788]" />}
                </button>
                {openFaq === i && (
                  <div className="p-4 pt-0 border-t border-[#1b4332]">
                    <p className="font-sans text-sm text-[#95d5b2] pt-4 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
