import React, { useState, useEffect } from 'react';
import { Bell, Plus, X, Clock, CheckCircle2, RotateCw, CalendarDays, AlertTriangle, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { format, parseISO, differenceInHours } from 'date-fns';
import toast from 'react-hot-toast';
import { sendReminderEmail } from '../../lib/resend';
import { motion, AnimatePresence } from 'framer-motion';

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string; // ISO string
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export default function RemindersModule() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchReminders = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('remind_at', { ascending: true });
    
    if (!error && data) {
      setReminders(data);
    } else if (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Fetch on mount and subscribe to realtime changes
  useEffect(() => {
    if (!user?.id) return;
    
    fetchReminders();

    const channel = supabase
      .channel(`realtime-reminders-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reminders', 
          filter: `user_id=eq.${user.id}` 
        },
        () => {
          fetchReminders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Checker for notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(async (rem) => {
        if (rem.completed) return;
        const remTime = new Date(rem.remind_at);
        // Check if reminder is due in the last minute
        if (remTime <= now && now.getTime() - remTime.getTime() < 60000) {
          if (Notification.permission === 'granted') {
            new Notification('HEXIS REMINDER', {
              body: rem.title,
              icon: '/hesixpng.png'
            });
          }
          
          if (user?.email) {
            sendReminderEmail(rem.title, format(remTime, 'MMM dd, yyyy - HH:mm'), user.email)
              .catch(err => console.error('Failed to send reminder email:', err));
          }
          
          if (rem.repeat_type === 'none') {
            await supabase
              .from('reminders')
              .update({ completed: true, completed_at: new Date().toISOString() })
              .eq('id', rem.id);
          } else if (rem.repeat_type === 'daily') {
            const nextTime = new Date(remTime.getTime() + 86400000).toISOString();
            await supabase
              .from('reminders')
              .update({ remind_at: nextTime })
              .eq('id', rem.id);
          } else if (rem.repeat_type === 'weekly') {
            const nextTime = new Date(remTime.getTime() + 7 * 86400000).toISOString();
            await supabase
              .from('reminders')
              .update({ remind_at: nextTime })
              .eq('id', rem.id);
          }
        }
      });
    }, 30000); // check every 30 seconds

    return () => clearInterval(interval);
  }, [reminders]);

  const handleAdd = async () => {
    if (!title || !date || !time || !user?.id) return;
    const dateTimeStr = `${date}T${time}`;
    
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      title,
      remind_at: new Date(dateTimeStr).toISOString(),
      repeat_type: repeat,
      completed: false
    });

    if (!error) {
      setTitle('');
      setDate('');
      setTime('');
      setRepeat('none');
      setIsFormOpen(false);
      toast.success('REMINDER ADDED');
    } else {
      console.error('Error adding reminder:', error);
      toast.error('Failed to add: ' + error.message);
    }
  };

  const markComplete = async (id: string) => {
    await supabase
      .from('reminders')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id);
  };

  const deleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
  };

  const activeReminders = reminders.filter(r => !r.completed);
  const pastReminders = reminders.filter(r => r.completed);

  return (
    <div className="h-full flex flex-col bg-[#0a1a0f] p-4 md:p-8 text-[#d8f3dc] font-mono relative overflow-hidden">
      
      {/* Premium Header */}
      <div className="flex items-center justify-between mb-8 border-b border-[#1b4332] pb-6 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-[#0d2818] p-3 border border-[#52b788] shadow-[0_0_15px_rgba(82,183,136,0.2)]">
            <Bell className="w-6 h-6 text-[#52b788]" />
          </div>
          <div>
            <h1 className="text-2xl tracking-widest font-bold text-[#d8f3dc] uppercase">REMINDERS</h1>
            <p className="text-xs text-[#52b788] mt-1 tracking-wider uppercase">Active Alerts: {activeReminders.length}</p>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all duration-300 uppercase tracking-widest border ${
            isFormOpen 
            ? 'bg-[#1b4332] text-[#95d5b2] border-[#1b4332] hover:bg-[#2d6a4f] hover:text-[#d8f3dc]' 
            : 'bg-[#52b788] text-[#0a1a0f] border-[#52b788] hover:bg-[#74c69d] shadow-[0_0_15px_rgba(82,183,136,0.3)]'
          }`}
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isFormOpen ? 'ABORT_ENTRY' : 'NEW_ALERT'}
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden shrink-0 relative z-10"
          >
            <div className="bg-[#0d2818] border border-[#52b788] p-6 shadow-[0_0_30px_rgba(82,183,136,0.1)] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#52b788] to-transparent opacity-50"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-[#52b788] mb-2 tracking-widest font-bold uppercase">Alert Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="E.G., REVIEW PROTOCOL ALPHA"
                    className="w-full bg-black border border-[#1b4332] focus:border-[#52b788] outline-none px-4 py-3 text-sm text-[#d8f3dc] transition-colors placeholder-[#1b4332]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#52b788] mb-2 tracking-widest font-bold uppercase flex items-center gap-2">
                    <CalendarDays size={12} /> Execution Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-black border border-[#1b4332] focus:border-[#52b788] outline-none px-4 py-3 text-sm uppercase text-[#95d5b2] [color-scheme:dark] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#52b788] mb-2 tracking-widest font-bold uppercase flex items-center gap-2">
                    <Clock size={12} /> Execution Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-black border border-[#1b4332] focus:border-[#52b788] outline-none px-4 py-3 text-sm uppercase text-[#95d5b2] [color-scheme:dark] transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-[#52b788] mb-2 tracking-widest font-bold uppercase flex items-center gap-2">
                    <RotateCw size={12} /> Recurrence Protocol
                  </label>
                  <select
                    value={repeat}
                    onChange={e => setRepeat(e.target.value as any)}
                    className="w-full bg-black border border-[#1b4332] focus:border-[#52b788] outline-none px-4 py-3 text-sm uppercase text-[#d8f3dc] appearance-none transition-colors"
                  >
                    <option value="none">SINGLE EXECUTION (NO REPEAT)</option>
                    <option value="daily">DAILY RECURRENCE</option>
                    <option value="weekly">WEEKLY RECURRENCE</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="w-full bg-transparent border border-[#52b788] hover:bg-[#52b788] text-[#52b788] hover:text-[#0a1a0f] font-bold py-3 text-xs tracking-widest uppercase transition-all duration-300"
              >
                INITIALIZE REMINDER
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2 relative z-10">
        <div>
          <h2 className="text-[10px] font-bold text-[#52b788] tracking-widest mb-4 border-b border-[#1b4332] pb-2 flex items-center gap-2 uppercase">
            <span className="w-2 h-2 bg-[#52b788] rounded-full animate-pulse"></span>
            ACTIVE_ALERTS
          </h2>
          
          {activeReminders.length === 0 ? (
            <div className="text-[#1b4332] text-xs uppercase py-10 flex flex-col items-center justify-center border border-dashed border-[#1b4332] bg-black/20">
              <Bell className="w-8 h-8 mb-3 opacity-20" />
              <span>SYSTEM IDLE: NO UPCOMING ALERTS</span>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {activeReminders.map(r => {
                  const hoursUntil = differenceInHours(parseISO(r.remind_at), new Date());
                  const isUrgent = hoursUntil <= 24 && hoursUntil >= 0;
                  const isOverdue = hoursUntil < 0;

                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={r.id} 
                      className={`flex items-center gap-4 p-4 border relative overflow-hidden group transition-all duration-300 ${
                        isOverdue ? 'bg-[#2d0a0a]/80 border-[#e63946] shadow-[0_0_15px_rgba(230,57,70,0.1)]' :
                        isUrgent ? 'bg-[#2d200a]/80 border-[#e9c46a] shadow-[0_0_15px_rgba(233,196,106,0.1)]' :
                        'bg-black/40 border-[#1b4332] hover:border-[#52b788] hover:bg-[#0d2818]'
                      }`}
                    >
                      {/* Accent line */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isOverdue ? 'bg-[#e63946]' : isUrgent ? 'bg-[#e9c46a]' : 'bg-[#52b788]'
                      }`}></div>

                      <button 
                        onClick={() => markComplete(r.id)} 
                        className={`shrink-0 transition-transform hover:scale-110 ${
                          isOverdue ? 'text-[#e63946]' : isUrgent ? 'text-[#e9c46a]' : 'text-[#2d6a4f] hover:text-[#52b788]'
                        }`}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate tracking-wide ${
                          isOverdue ? 'text-[#ffb3c1]' : isUrgent ? 'text-[#ffea99]' : 'text-[#d8f3dc]'
                        }`}>
                          {r.title}
                        </div>
                        <div className="text-[10px] mt-1.5 flex items-center gap-3 font-bold tracking-widest">
                          <span className={`flex items-center gap-1.5 ${
                            isOverdue ? 'text-[#e63946]' : isUrgent ? 'text-[#e9c46a]' : 'text-[#52b788]'
                          }`}>
                            {isOverdue ? <AlertTriangle size={10} className="animate-pulse" /> : <Clock size={10} />}
                            {format(parseISO(r.remind_at), 'MMM dd, yyyy - HH:mm')}
                            {isOverdue && ' (OVERDUE)'}
                            {isUrgent && !isOverdue && ' (URGENT)'}
                          </span>
                          
                          {r.repeat_type !== 'none' && (
                            <>
                              <span className="text-[#1b4332]">|</span>
                              <span className="flex items-center gap-1 text-[#95d5b2]">
                                <RotateCw size={10} />
                                {r.repeat_type.toUpperCase()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteReminder(r.id)} 
                        className="shrink-0 p-2 text-[#2d6a4f] hover:text-[#e63946] hover:bg-[#2d0a0a] transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-[#e63946]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[10px] font-bold text-[#2d6a4f] tracking-widest mb-4 border-b border-[#1b4332] pb-2 flex items-center gap-2 uppercase mt-8">
            <span className="w-2 h-2 bg-[#2d6a4f] rounded-full"></span>
            ARCHIVED_LOGS
          </h2>
          
          {pastReminders.length === 0 ? (
            <div className="text-[#1b4332] text-xs uppercase py-6 text-center border border-[#1b4332] border-dashed bg-black/10">
              NO HISTORY
            </div>
          ) : (
            <div className="space-y-2 opacity-60">
              {pastReminders.map(r => (
                <div key={r.id} className="flex items-center gap-4 bg-transparent border border-[#1b4332] p-3 group hover:border-[#2d6a4f] transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-[#2d6a4f] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#95d5b2] line-through decoration-[#1b4332] truncate">{r.title}</div>
                    <div className="text-[9px] text-[#2d6a4f] mt-1 tracking-widest">
                      COMPLETED: {format(parseISO(r.remind_at), 'MMM dd, yyyy - HH:mm')}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteReminder(r.id)} 
                    className="text-[#1b4332] hover:text-[#e63946] p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
