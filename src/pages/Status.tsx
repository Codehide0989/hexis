import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Hexagon, Activity, Database, Key, HardDrive, Wifi, Globe } from 'lucide-react';

const Status = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const services = [
    { name: 'API GATEWAY', icon: Activity, status: 'OPERATIONAL' },
    { name: 'DATABASE CLUSTER', icon: Database, status: 'OPERATIONAL' },
    { name: 'AUTHENTICATION', icon: Key, status: 'OPERATIONAL' },
    { name: 'ENCRYPTED STORAGE', icon: HardDrive, status: 'OPERATIONAL' },
    { name: 'REALTIME SYNC', icon: Wifi, status: 'OPERATIONAL' },
    { name: 'GLOBAL CDN', icon: Globe, status: 'OPERATIONAL' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'text-[#52b788] border-[#52b788]';
      case 'DEGRADED': return 'text-[#e9c46a] border-[#e9c46a]';
      case 'DOWN': return 'text-[#e63946] border-[#e63946]';
      default: return 'text-[#95d5b2] border-[#1b4332]';
    }
  };
  
  const getDotColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-[#52b788]';
      case 'DEGRADED': return 'bg-[#e9c46a]';
      case 'DOWN': return 'bg-[#e63946]';
      default: return 'bg-[#95d5b2]';
    }
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

      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          initial="hidden" animate="visible" variants={fadeInUp}
          className="text-center mb-16"
        >
          <h1 className="font-mono font-bold text-4xl md:text-5xl text-[#d8f3dc] tracking-widest uppercase mb-4">SYSTEM_STATUS</h1>
          <div className="w-24 h-1 bg-[#1b4332] mx-auto mb-6"></div>
          <p className="font-sans text-[#95d5b2] text-lg">
            Current operational status of all HEXIS network nodes and services.
          </p>
        </motion.div>

        {/* Global Status Banner */}
        <motion.div 
          initial="hidden" animate="visible" variants={fadeInUp}
          className="bg-[#0d2818] border border-[#52b788] p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-[#52b788] rounded-full animate-pulse shadow-[0_0_10px_#52b788]"></div>
            <div>
              <h2 className="font-mono font-bold text-xl text-[#d8f3dc] uppercase tracking-widest">ALL SYSTEMS NOMINAL</h2>
              <p className="font-sans text-sm text-[#95d5b2]">Uptime: 99.9% over the last 90 days</p>
            </div>
          </div>
          <div className="bg-[#0a1a0f] border border-[#1b4332] px-4 py-2 font-mono text-xs text-[#52b788] uppercase tracking-widest">
            Last Updated: {new Date().toLocaleTimeString()}
          </div>
        </motion.div>

        {/* Services Grid */}
        <motion.div 
          initial="hidden" animate="visible" variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {services.map((service, i) => (
            <motion.div key={i} variants={fadeInUp} className="bg-[#0d2818] border border-[#1b4332] p-6">
              <div className="flex items-center justify-between mb-6">
                <service.icon size={24} className="text-[#52b788]" />
                <div className={`flex items-center gap-2 border px-3 py-1 font-mono text-xs font-bold tracking-widest ${getStatusColor(service.status)}`}>
                  <div className={`w-2 h-2 rounded-full ${service.status === 'OPERATIONAL' ? 'animate-pulse' : ''} ${getDotColor(service.status)}`}></div>
                  {service.status}
                </div>
              </div>
              <h3 className="font-mono font-bold text-[#d8f3dc] uppercase tracking-widest">{service.name}</h3>
            </motion.div>
          ))}
        </motion.div>

        {/* Metrics Placeholder */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-16">
          <h2 className="font-mono font-bold text-xl text-[#d8f3dc] uppercase tracking-widest mb-6">RESPONSE TIMES</h2>
          <div className="bg-[#0d2818] border border-[#1b4332] h-64 w-full flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(to right, #1b4332 1px, transparent 1px), linear-gradient(to bottom, #1b4332 1px, transparent 1px)',
              backgroundSize: '2rem 2rem'
            }}></div>
            <div className="relative z-10 flex flex-col items-center">
              <Activity size={32} className="text-[#1b4332] mb-4" />
              <p className="font-mono text-sm text-[#1b4332] uppercase tracking-widest">[ METRICS VISUALIZATION ACTIVE ]</p>
            </div>
            
            {/* Fake graph line */}
            <svg className="absolute inset-0 h-full w-full opacity-50 z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
              <polyline points="0,70 10,65 20,72 30,55 40,68 50,50 60,60 70,45 80,50 90,30 100,40" fill="none" stroke="#52b788" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        {/* Incident History */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <h2 className="font-mono font-bold text-xl text-[#d8f3dc] uppercase tracking-widest mb-6">INCIDENT HISTORY</h2>
          <div className="bg-[#0d2818] border border-[#1b4332] overflow-hidden">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${i !== 4 ? 'border-b border-[#1b4332]' : ''}`}>
                <div>
                  <div className="font-mono text-sm text-[#d8f3dc] mb-1">No incidents reported</div>
                  <div className="font-sans text-xs text-[#95d5b2]">All systems functioned normally.</div>
                </div>
                <div className="font-mono text-xs text-[#52b788] whitespace-nowrap">
                  {new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Status;
