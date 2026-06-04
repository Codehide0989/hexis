import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Hexagon, Shield, Key, Database, EyeOff } from 'lucide-react';

const Protocol = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const sections = [
    {
      num: '01',
      icon: Key,
      title: 'ANONYMOUS AUTHENTICATION',
      desc: 'Instead of storing emails and passwords, HEXIS relies on a cryptographic identity. When you register, a salt is generated on your device. Your chosen alias and passphrase are mathematically hashed using MD5 or stronger PBKDF2 derivations before being transmitted. We only see the resulting hash, not your actual credentials.',
      code: `function generateIdentity(alias, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = pbkdf2(passphrase, salt, 600000, 256, 'sha256');
  return { aliasHash: md5(alias), authKey: hash };
}`
    },
    {
      num: '02',
      icon: Shield,
      title: 'ENCRYPTION STANDARD',
      desc: 'All data is encrypted before it leaves your device using AES-256-GCM. The encryption key never leaves your local environment. This means even if our databases were compromised, the attacker would only see unintelligible ciphertexts. We cannot read your tasks, notes, or financial records.',
      code: `async function encryptPayload(data, masterKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  const cipherText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    masterKey,
    encodedData
  );
  return { iv, cipherText };
}`
    },
    {
      num: '03',
      icon: Database,
      title: 'DATA ISOLATION',
      desc: 'At the database layer, strict Row Level Security (RLS) policies ensure that even if an authenticated user tries to query the database directly, they can only retrieve rows tied to their specific identity hash. Your workspace is mathematically partitioned from all others.',
      code: `CREATE POLICY "Isolate User Data"
ON public.vault_items
FOR ALL
USING (auth.uid() = owner_id);

-- Enforced at the PostgreSQL level
-- Bypassing application logic entirely`
    },
    {
      num: '04',
      icon: EyeOff,
      title: 'ZERO KNOWLEDGE',
      desc: 'We operate on a strict Zero Knowledge principle. We do not track analytics, IP addresses, or usage patterns. Our systems are designed to know as little about you as possible while still delivering a seamless productivity experience. You own your data.',
      code: `> Checking telemetry configuration...
> Telemetry: DISABLED
> Checking logging level...
> Logging: ERRORS_ONLY (SANITIZED)
> IP Tracking: NULL ROUTED
> Status: ANONYMITY PRESERVED`
    }
  ];

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

      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          initial="hidden" animate="visible" variants={fadeInUp}
          className="text-center mb-20"
        >
          <h1 className="font-mono font-bold text-4xl md:text-5xl text-[#d8f3dc] tracking-widest uppercase mb-4">SECURITY_PROTOCOL</h1>
          <div className="w-24 h-1 bg-[#1b4332] mx-auto mb-6"></div>
          <p className="font-sans text-[#95d5b2] text-lg">
            An overview of the cryptographic operations protecting your workspace.
          </p>
        </motion.div>

        <div className="space-y-16">
          {sections.map((section, i) => (
            <motion.div 
              key={i}
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="bg-[#0d2818] border border-[#1b4332] p-8 md:p-10 relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 font-mono font-bold text-9xl text-[#1b4332] opacity-20 pointer-events-none select-none z-0">
                {section.num}
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 border border-[#52b788] flex items-center justify-center shrink-0">
                      <section.icon size={24} className="text-[#52b788]" />
                    </div>
                    <h2 className="font-mono font-bold text-xl text-[#d8f3dc] tracking-widest uppercase">{section.title}</h2>
                  </div>
                  <p className="font-sans text-[#95d5b2] text-base leading-relaxed mb-6">
                    {section.desc}
                  </p>
                </div>
                
                <div className="flex-1 md:max-w-md w-full shrink-0">
                  <div className="bg-[#0a1a0f] border border-[#1b4332] p-4 font-mono text-xs text-[#52b788] whitespace-pre-wrap leading-relaxed shadow-inner">
                    {section.code}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Protocol;
