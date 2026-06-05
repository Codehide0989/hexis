import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  CheckSquare, 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Wallet, 
  Shield,
  Terminal,
  ArrowRight,
  Activity,
  Server,
  Lock,
  Key,
  Database,
  CheckCircle2,
  Hexagon,
  Menu,
  X
} from 'lucide-react';

const Landing = () => {
  const [terminalText, setTerminalText] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const terminalLines = [
    '> SYSTEM READY',
    '> ANONYMOUS MODE: ACTIVE',
    '> ENCRYPTION: ENABLED',
    '> AWAITING INITIALIZATION...'
  ];
  
  useEffect(() => {
    let currentLines: string[] = [];
    let i = 0;
    const interval = setInterval(() => {
      if (i < terminalLines.length) {
        currentLines.push(terminalLines[i]);
        setTerminalText(currentLines.join('\n'));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="bg-[#0a1a0f] min-h-screen text-[#d8f3dc] font-sans relative">
      {/* Grid overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#52b788 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a1a0f]/90 backdrop-blur-sm border-b border-[#1b4332] h-14">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/hesixpng.png" alt="HEXIS" className="w-6 h-6 object-contain" />
            <span className="font-mono font-bold text-[#52b788] text-xl tracking-widest uppercase">HEXIS</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/status" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">STATUS</Link>
            <a href="#features" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">FEATURES</a>
            <Link to="/protocol" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">PROTOCOL</Link>
            <Link to="/pricing" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">PRICING</Link>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <Link to="/login" className="font-mono text-xs uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788] transition-colors duration-200">LOGIN</Link>
            <Link to="/signup" className="border border-[#52b788] text-[#52b788] font-mono text-xs tracking-widest uppercase px-4 py-2 hover:bg-[#52b788] hover:text-[#0a1a0f] transition-colors duration-200">INITIALIZE SESSION</Link>
          </div>

          <button 
            className="md:hidden text-[#52b788]" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a1a0f] border-b border-[#1b4332] absolute top-14 left-0 right-0 p-6 flex flex-col gap-6">
            <Link to="/status" onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788]">STATUS</Link>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788]">FEATURES</a>
            <Link to="/protocol" onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788]">PROTOCOL</Link>
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788]">PRICING</Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="font-mono text-sm uppercase tracking-widest text-[#95d5b2] hover:text-[#52b788]">LOGIN</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="border border-[#52b788] text-[#52b788] font-mono text-xs tracking-widest uppercase px-4 py-3 text-center mt-2 hover:bg-[#52b788] hover:text-[#0a1a0f]">INITIALIZE SESSION</Link>
          </div>
        )}
      </nav>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section id="hero" className="pt-32 pb-24 px-6 min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-[#0a1a0f] via-[#0a1a0f] to-[#0d2818]">
          <div className="max-w-5xl mx-auto text-center w-full">
            <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
              <span className="border border-[#52b788] text-[#52b788] bg-[#52b788]/10 font-mono text-xs px-4 py-1 tracking-widest uppercase mb-8 inline-block">
                [ ANONYMOUS · ENCRYPTED · PRIVATE ]
              </span>
              <h1 className="font-mono font-bold text-5xl md:text-7xl lg:text-8xl tracking-widest leading-tight mb-6 uppercase">
                <span className="text-[#d8f3dc] block">YOUR WORKSPACE</span>
                <span className="text-[#52b788] block">YOUR RULES.</span>
              </h1>
              <p className="font-sans text-[#95d5b2] text-base md:text-lg max-w-2xl mx-auto mb-12">
                The untrackable productivity suite. Secure tasks, notes, and finances wrapped in military-grade cryptography.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
                <Link to="/signup" className="bg-[#52b788] text-[#0a1a0f] font-mono font-bold text-sm tracking-widest uppercase px-8 py-3 flex items-center gap-2 hover:bg-[#74c69d] transition-colors duration-200">
                  INITIALIZE <ArrowRight size={16} className="text-[#0a1a0f]" />
                </Link>
                <a href="#features" className="border border-[#52b788] text-[#52b788] font-mono font-bold text-sm tracking-widest uppercase px-8 py-3 hover:bg-[#52b788] hover:text-[#0a1a0f] transition-colors duration-200">
                  VIEW PROTOCOLS
                </a>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="max-w-2xl mx-auto bg-[#0d2818] border border-[#1b4332] p-6 text-left"
            >
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#1b4332]">
                <Terminal size={16} className="text-[#52b788]" />
                <span className="font-mono text-xs text-[#52b788] tracking-widest uppercase">HEXIS_CORE_v2.4.1</span>
                <span className="ml-auto font-mono text-xs text-[#2d6a4f]">TERMINAL_ACTIVE</span>
              </div>
              <pre className="font-mono text-xs md:text-sm text-[#52b788] whitespace-pre-wrap leading-relaxed min-h-[8rem] uppercase">
                {terminalText}
                <span className="inline-block w-2 h-4 bg-[#52b788] ml-1 animate-pulse align-middle"></span>
              </pre>
            </motion.div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="bg-[#0d2818] border-y border-[#1b4332] py-6">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
              {[
                { label: "SYSTEM STATUS", value: "OPERATIONAL" },
                { label: "ENCRYPTED SESSIONS", value: "14 ACTIVE" },
                { label: "ENCRYPTION", value: "AES-256" },
                { label: "END-TO-END", value: "VERIFIED" }
              ].map((stat, i) => (
                <div key={i} className={`text-center py-4 px-8 ${i !== 3 ? 'md:border-r border-[#1b4332]' : ''} ${i === 0 || i === 1 ? 'border-r border-[#1b4332] md:border-r-0' : ''} ${i === 1 && 'md:border-r border-[#1b4332]'}`}>
                  <div className="font-mono font-bold text-lg text-[#52b788] mb-1">{stat.value}</div>
                  <div className="font-mono text-xs text-[#95d5b2] tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="bg-[#0a1a0f] py-24 px-6 border-t border-[#1b4332]">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
              className="text-center mb-16 flex flex-col items-center"
            >
              <div className="bg-[#52b788]/10 border border-[#52b788] px-4 py-1 font-mono text-xs text-[#52b788] mb-6 tracking-widest uppercase">
                CORE_MODULES
              </div>
              <h2 className="text-3xl md:text-4xl text-[#d8f3dc] font-mono font-bold uppercase tracking-widest">
                ENCRYPTED WORKSPACE
              </h2>
            </motion.div>

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[
                { icon: CheckSquare, tag: 'MODULE_01', title: 'TASKS', desc: 'Zero-knowledge task management. Track your progress invisibly.' },
                { icon: LayoutDashboard, tag: 'MODULE_02', title: 'KANBAN', desc: 'Visual workflow management encrypted at rest and in transit.' },
                { icon: Calendar, tag: 'MODULE_03', title: 'CALENDAR', desc: 'Local-first event scheduling. Sync only when necessary.' },
                { icon: FileText, tag: 'MODULE_04', title: 'INVOICES', desc: 'Generate and track anonymous billing documents.' },
                { icon: Wallet, tag: 'MODULE_05', title: 'FINANCE', desc: 'Private financial tracking without linking to real-world identity.' },
                { icon: Shield, tag: 'MODULE_06', title: 'VAULT', desc: 'AES-256 encrypted file storage. Chunked and secured locally.' }
              ].map((feature, i) => (
                <motion.div key={i} variants={fadeInUp} className="bg-[#0d2818] border border-[#1b4332] p-6 hover:border-[#52b788] hover:bg-[#0d2818]/80 transition-colors duration-200 relative">
                  <div className="font-mono text-xs text-[#52b788] mb-4 uppercase">{feature.tag}</div>
                  <feature.icon size={20} className="text-[#52b788] mb-4" />
                  <h3 className="text-[#d8f3dc] font-mono font-bold text-lg uppercase tracking-widest mb-2">{feature.title}</h3>
                  <p className="text-[#95d5b2] font-sans text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* INITIALIZATION SEQUENCE */}
        <section id="how-it-works" className="py-24 px-6 bg-[#0d2818] border-y border-[#1b4332]">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="text-center mb-20"
            >
              <h2 className="font-mono font-bold text-3xl md:text-4xl text-[#d8f3dc] tracking-widest uppercase">INITIALIZATION SEQUENCE</h2>
              <div className="w-24 h-1 bg-[#1b4332] mx-auto mt-6"></div>
            </motion.div>

            <div className="space-y-16">
              {[
                {
                  num: '01', title: 'REGISTER ALIAS', desc: 'No email required. Generate your unique alias. We do not track your IP or metadata.',
                  code: '> node auth.js --register\n> Generating salt...\n> Alias: phantom_actual\n> Status: ALIAS ALLOCATED'
                },
                {
                  num: '02', title: 'GENERATE MASTER KEY', desc: 'Create a master passphrase. This key is hashed locally and never leaves your device. If lost, data is unrecoverable.',
                  code: '> Hash initialized\n> PBKDF2 iterations: 600,000\n> Encrypting local vault...\n> Status: KEYPAIR LOCKED'
                },
                {
                  num: '03', title: 'ACCESS DASHBOARD', desc: 'Enter the secure vault and begin operations. All modules are end-to-end encrypted automatically.',
                  code: '> Decrypting modules...\n> Tasks: UNLOCKED\n> Vault: UNLOCKED\n> Status: OPERATION READY'
                }
              ].map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.5 }}
                  className={`flex flex-col ${i === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}
                >
                  <div className="flex-1 w-full text-left relative">
                    <div className="absolute -left-4 -top-8 font-mono font-bold text-8xl text-[#1b4332] opacity-50 pointer-events-none select-none z-0">{step.num}</div>
                    <div className="relative z-10 pl-4 md:pl-0">
                      <h3 className="font-mono font-bold text-2xl text-[#d8f3dc] uppercase tracking-widest mb-4 flex items-center justify-start gap-3">
                        {i === 1 ? <Key size={24} className="text-[#52b788]" /> : i === 2 ? <Database size={24} className="text-[#52b788]" /> : <Activity size={24} className="text-[#52b788]" />}
                        {step.title}
                      </h3>
                      <p className="font-sans text-[#95d5b2] text-base leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="bg-[#0d2818] border border-[#52b788] p-6 font-mono text-xs text-[#52b788] whitespace-pre-wrap leading-relaxed shadow-lg">
                      {step.code}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 px-6 bg-[#0a1a0f]">
          <div className="max-w-6xl mx-auto">
             <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="font-mono font-bold text-3xl md:text-4xl text-[#d8f3dc] tracking-widest uppercase">RESOURCE_ALLOCATION</h2>
              <div className="w-24 h-1 bg-[#1b4332] mx-auto mt-6"></div>
            </motion.div>

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
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
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="py-24 px-6 bg-[#0a1a0f] border-t border-[#1b4332]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 w-full">
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
                className="mb-12 text-left"
              >
                <h2 className="font-mono font-bold text-3xl md:text-4xl text-[#d8f3dc] tracking-widest uppercase mb-4">YOUR IDENTITY.<br/>PROTECTED.</h2>
                <div className="w-16 h-1 bg-[#1b4332]"></div>
              </motion.div>

              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
                className="space-y-4"
              >
                {[
                  { title: 'ANONYMOUS SIGNUP', desc: 'We do not ask for names, emails, or phone numbers. Your identity is a cryptographic hash.' },
                  { title: 'LOCAL KEY AUTHENTICATION', desc: 'Client-side hashing ensures your raw credentials never traverse the network.' },
                  { title: 'ZERO DATA SHARING', desc: 'We mathematically cannot share your data because we cannot read it. End-to-end encrypted by default.' }
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeInUp} className="bg-[#0d2818] border border-[#1b4332] p-6 flex items-start gap-4 hover:border-[#52b788] transition-colors duration-200">
                    <div className="w-10 h-10 border border-[#52b788] flex items-center justify-center shrink-0">
                      <Shield size={20} className="text-[#52b788]" />
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-[#d8f3dc] uppercase tracking-widest">{item.title}</h3>
                      <p className="font-sans text-[#95d5b2] text-xs leading-relaxed mt-2">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            
            <div className="flex-1 w-full md:block">
              <div className="bg-[#0d2818] border border-[#52b788] p-6 font-mono text-xs text-[#52b788] whitespace-pre-wrap leading-relaxed shadow-lg">
                {`> BEGIN SECURITY AUDIT...
> CHECKING DATA AT REST...
[OK] AES-256-GCM VERIFIED
> CHECKING DATA IN TRANSIT...
[OK] TLS 1.3 ENABLED
> CHECKING RLS POLICIES...
[OK] ROW LEVEL SECURITY ACTIVE
> CHECKING AUTHENTICATION...
[OK] MD5 HASHING CONFIRMED
> AUDIT COMPLETE.
> SYSTEM IS SECURE.`}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0a1a0f] border-t border-[#1b4332] py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-[#1b4332] pb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/hesixpng.png" alt="HEXIS" className="w-8 h-8 object-contain" />
                <span className="font-mono font-bold text-[#52b788] text-3xl tracking-widest uppercase">HEXIS</span>
              </div>
              <p className="font-sans text-[#95d5b2] text-sm leading-relaxed max-w-xs">
                Built for privacy. Designed for productivity. The untrackable productivity suite.
              </p>
            </div>
            
            <div>
              <h4 className="font-mono font-bold text-sm text-[#d8f3dc] uppercase tracking-widest mb-6">PRODUCT</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Features</a></li>
                <li><Link to="/pricing" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Pricing</Link></li>
                <li><Link to="/status" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Status</Link></li>
                <li><Link to="/protocol" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Protocol</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-sm text-[#d8f3dc] uppercase tracking-widest mb-6">SECURITY</h4>
              <ul className="space-y-3">
                <li><Link to="/protocol" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Anonymous Auth</Link></li>
                <li><Link to="/protocol" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Encryption</Link></li>
                <li><Link to="/protocol" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Privacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-bold text-sm text-[#d8f3dc] uppercase tracking-widest mb-6">COMPANY</h4>
              <ul className="space-y-3">
                <li><a href="#" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">About</a></li>
                <li><a href="#" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Contact</a></li>
                <li><a href="#" className="font-mono text-xs text-[#95d5b2] hover:text-[#52b788] transition-colors uppercase">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-mono text-[#95d5b2] text-xs uppercase tracking-widest text-center md:text-left">
              &copy; {new Date().getFullYear()} HEXIS PROTOCOL. ALL RIGHTS RESERVED.
            </div>
            <div className="font-mono text-[#52b788] text-xs uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#52b788] rounded-full animate-pulse"></div>
              WORK IN THE SHADOWS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
