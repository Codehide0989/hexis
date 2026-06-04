import React, { useState, useEffect } from 'react';
import { Plus, Download, Printer, Send, Trash2, ArrowLeft, Eye, Save, Mail, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../context/PlanContext';
import { UpgradeGate } from '../../components/ui/UpgradeGate';
import { toast } from 'react-hot-toast';
import { sendInvoiceEmail } from '../../lib/resend';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LineItem {
  description: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  items: LineItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string;
  notes: string;
  created_at: string;
}

export default function Invoices() {
  const { user } = useAuth();
  const { canUse } = usePlan();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'create' | 'preview'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'INR'>(() => 
    (localStorage.getItem('hexis_currency') as 'USD' | 'INR') || 'INR'
  );

  const sym = currency === 'INR' ? '₹' : '$';

  // Create Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [taxPercent, setTaxPercent] = useState(0);

  // List State
  const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'>('ALL');

  useEffect(() => {
    if (!user?.id) return;
    
    fetchInvoices();
    
    const channel = supabase
      .channel('module-invoices-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchInvoices();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);

  const fetchInvoices = async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Fetch invoices error:', error)
      setLoading(false)
      return
    }
    
    if (data) {
      const formatted = data.map(inv => ({
        ...inv,
        items: Array.isArray(inv.items) 
          ? inv.items 
          : typeof inv.items === 'string'
            ? JSON.parse(inv.items)
            : []
      }))
      setInvoices(formatted)
    }
    setLoading(false)
  }

  const changeCurrency = (c: 'USD' | 'INR') => {
    setCurrency(c);
    localStorage.setItem('hexis_currency', c);
  };

  // Calculations for Create View
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const taxAmount = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + taxAmount;
  
  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `INV-${timestamp}-${random}`;
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const handleUpdateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const saveDraft = async (
    asDraft: boolean = true
  ): Promise<Invoice | null> => {
    if (!user) return null
    
    // Validate required fields
    if (!clientName.trim()) {
      toast.error('CLIENT NAME IS REQUIRED')
      return null
    }

    const invoiceNumber = selectedInvoice ? selectedInvoice.invoice_number : generateInvoiceNumber()
    
    // Build insert object WITHOUT issue_date first
    // (we add it only if column exists)
    const newInvoice: any = {
      user_id: user.id,
      invoice_number: invoiceNumber,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_address: clientAddress.trim(),
      items: items,  // store as JSONB directly, not stringified
      subtotal,
      tax_percent: taxPercent,
      tax_amount: (subtotal * taxPercent) / 100,
      total: grandTotal,
      status: asDraft ? 'draft' : 'sent',
      due_date: dueDate || null,
      notes: notes.trim(),
    }

    try {
      let query;
      
      if (selectedInvoice?.id) {
        // Update existing invoice
        query = supabase
          .from('invoices')
          .update(newInvoice)
          .eq('id', selectedInvoice.id)
          .select()
          .single()
      } else {
        // Create new invoice
        query = supabase
          .from('invoices')
          .insert([newInvoice])
          .select()
          .single()
      }

      const { data, error } = await query

      if (error) {
        // If issue_date column missing, try without it
        if (error.message.includes('issue_date')) {
          // Already excluded above, so this is another error
          throw error
        }
        throw error
      }

      toast.success(asDraft ? 'DRAFT SAVED' : 'INVOICE CREATED')
      fetchInvoices()
      return {
        ...data,
        items: typeof data.items === 'string' 
          ? JSON.parse(data.items) 
          : (data.items || [])
      }
    } catch (err: any) {
      console.error('Invoice save error:', err)
      toast.error('SAVE FAILED: ' + err.message)
      return null
    }
  }

  const handleSaveDraftClick = async () => {
    await saveDraft();
    setView('list');
  };

  const sendInvoice = async (invoiceToUse?: Invoice) => {
    let invoiceData = invoiceToUse || selectedInvoice;
    
    if (view === 'create') {
      const saved = await saveDraft(false);
      if (!saved) return;
      invoiceData = saved;
    }

    if (!invoiceData) return;

    toast.loading('Sending email...', { id: 'send-email' });
    
    const emailData = {
      to: invoiceData.client_email,
      clientName: invoiceData.client_name,
      invoiceNumber: invoiceData.invoice_number,
      total: invoiceData.total,
      currency,
      dueDate: invoiceData.due_date,
      items: invoiceData.items.map(i => ({ ...i, total: i.quantity * i.price })),
      notes: invoiceData.notes
    };

    const res = await sendInvoiceEmail(emailData);

    if (res.success) {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceData.id);
      
      toast.success('INVOICE SENT', { id: 'send-email' });
      fetchInvoices();
    } else {
      toast.error(`EMAIL FAILED: ${res.error} — Draft saved`, { id: 'send-email' });
    }
    
    setView('list');
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update: ' + error.message);
      console.error('Mark paid error:', error);
    } else {
      toast.success('MARKED AS PAID');
      fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'paid' });
      }
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete invoice');
    } else {
      toast.success('INVOICE DELETED');
      fetchInvoices();
      if (view === 'preview' && selectedInvoice?.id === id) {
        setView('list');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;
    const printEl = document.getElementById('invoice-print');
    if (!printEl) return;
    
    toast.loading('Generating PDF...', { id: 'pdf' });
    try {
      const canvas = await html2canvas(printEl, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HEXIS-${selectedInvoice.invoice_number}.pdf`);
      toast.success('PDF DOWNLOADED', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf' });
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setDueDate('');
    setNotes('');
    setItems([{ description: '', quantity: 1, price: 0 }]);
    setTaxPercent(0);
    setSelectedInvoice(null);
  };

  // List Derived Data
  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length
  };

  const filteredInvoices = invoices.filter(i => {
    if (filter === 'ALL') return true;
    return i.status.toUpperCase() === filter;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      draft: 'bg-[#1b4332] text-[#95d5b2]',
      sent: 'bg-[#e9c46a]/20 text-[#e9c46a] border border-[#e9c46a]',
      paid: 'bg-[#52b788]/20 text-[#52b788] border border-[#52b788]',
      overdue: 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]'
    };
    return (
      <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 flex-shrink-0 ${map[status] || map.draft}`}>
        {status}
      </span>
    );
  };

  const renderContent = () => {
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-mono text-[#52b788] uppercase tracking-wider mb-2">INVOICE_SYSTEM</h1>
            <p className="text-[#95d5b2] font-mono text-sm uppercase">Manage client billing & receivables</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-1 border border-[#1b4332]">
              <button 
                onClick={() => changeCurrency('INR')}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  currency === 'INR' ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788]'
                }`}>
                ₹ INR
              </button>
              <button 
                onClick={() => changeCurrency('USD')}
                className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                  currency === 'USD' ? 'bg-[#52b788] text-[#0a1a0f]' : 'text-[#95d5b2] hover:text-[#52b788]'
                }`}>
                $ USD
              </button>
            </div>
            <button 
              onClick={() => { resetForm(); setView('create'); }}
              className="hex-btn-primary flex items-center gap-2">
              <Plus size={16} /> CREATE INVOICE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <p className="text-xs text-[#95d5b2] font-mono uppercase mb-2">TOTAL</p>
            <p className="text-2xl text-[#d8f3dc] font-mono">{stats.total}</p>
          </div>
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <p className="text-xs text-[#95d5b2] font-mono uppercase mb-2">DRAFT</p>
            <p className="text-2xl text-[#d8f3dc] font-mono">{stats.draft}</p>
          </div>
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <p className="text-xs text-[#95d5b2] font-mono uppercase mb-2">SENT</p>
            <p className="text-2xl text-[#e9c46a] font-mono">{stats.sent}</p>
          </div>
          <div className="bg-[#0d2818] border border-[#1b4332] p-4">
            <p className="text-xs text-[#95d5b2] font-mono uppercase mb-2">PAID</p>
            <p className="text-2xl text-[#52b788] font-mono">{stats.paid}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-4 border-b border-[#1b4332] pb-2">
          {['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`font-mono text-xs uppercase pb-2 px-1 transition-colors ${
                filter === f ? 'border-b-2 border-[#52b788] text-[#52b788]' : 'text-[#95d5b2] hover:text-[#d8f3dc]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-[#0d2818] border border-[#1b4332] flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[#0a1a0f]">
                <tr>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">INVOICE #</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">CLIENT</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">AMOUNT</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">STATUS</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">ISSUED</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">DUE</th>
                  <th className="font-mono text-xs text-[#52b788] uppercase tracking-widest px-4 py-3 text-left border-b border-[#1b4332]">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-[#1b4332] hover:bg-[#0d2818] transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-[#52b788]">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#d8f3dc]">{inv.client_name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#d8f3dc]">{sym}{inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-[#95d5b2]">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#95d5b2]">{inv.due_date}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button 
                        onClick={() => { setSelectedInvoice(inv); setView('preview'); }}
                        className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-transparent hover:border-[#1b4332] transition-colors"
                        title="Preview">
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => { sendInvoice(inv); }}
                        className="p-1.5 text-[#95d5b2] hover:text-[#52b788] border border-transparent hover:border-[#1b4332] transition-colors"
                        title="Send via Email">
                        <Send size={16} />
                      </button>
                      <button 
                        onClick={() => deleteInvoice(inv.id)}
                        className="p-1.5 text-[#95d5b2] hover:text-[#e63946] border border-transparent hover:border-[#1b4332] transition-colors"
                        title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center font-mono text-sm text-[#2d6a4f] uppercase tracking-widest">
                      NO INVOICES FOUND
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setView('list')}
            className="text-[#52b788] hover:text-[#95d5b2] transition-colors p-2 border border-[#1b4332] bg-[#0d2818]"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-mono text-[#52b788] uppercase tracking-wider">CREATE NEW INVOICE</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="bg-[#0d2818] border border-[#1b4332] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="hex-label">CLIENT NAME</label>
                  <input className="hex-input" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div>
                  <label className="hex-label">CLIENT EMAIL</label>
                  <input type="email" className="hex-input" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="hex-label">CLIENT ADDRESS</label>
                  <input className="hex-input" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
                </div>
                <div>
                  <label className="hex-label">DUE DATE</label>
                  <input type="date" className="hex-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="hex-label">NOTES</label>
                <textarea rows={3} className="hex-input" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>
            </div>

            <div className="bg-[#0d2818] border border-[#1b4332] p-6">
              <h2 className="font-mono text-[#52b788] text-sm uppercase tracking-widest mb-4">LINE ITEMS</h2>
              
              <div className="space-y-2 mb-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <input className="hex-input text-xs" placeholder="Description" value={item.description} onChange={e => handleUpdateItem(index, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" className="hex-input text-xs text-center" value={item.quantity} onChange={e => handleUpdateItem(index, 'quantity', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" className="hex-input text-xs" value={item.price} onChange={e => handleUpdateItem(index, 'price', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <div className="hex-input text-xs text-[#52b788] flex items-center bg-[#0a1a0f]">
                        {sym}{(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => handleDeleteItem(index)} className="hex-btn-danger p-2 h-full w-full flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button onClick={handleAddItem} className="hex-btn-outline w-full py-2 text-xs flex items-center justify-center gap-2">
                <Plus size={14} /> ADD LINE ITEM
              </button>
            </div>
          </div>

          <div className="lg:w-[300px]">
            <div className="bg-[#0d2818] border border-[#1b4332] p-6 sticky top-6">
              <h2 className="font-mono text-xs text-[#52b788] mb-4 tracking-widest">INVOICE SUMMARY</h2>

              <div className="flex justify-between py-2 border-b border-[#1b4332]">
                <span className="font-mono text-xs text-[#95d5b2]">SUBTOTAL</span>
                <span className="font-mono text-sm text-[#d8f3dc]">{sym}{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-[#1b4332]">
                <span className="font-mono text-xs text-[#95d5b2]">TAX (%)</span>
                <input 
                  type="number" 
                  className="w-16 bg-[#0a1a0f] border border-[#1b4332] font-mono text-xs text-[#d8f3dc] px-2 py-1 text-right outline-none focus:border-[#52b788]"
                  value={taxPercent}
                  onChange={e => setTaxPercent(Number(e.target.value))} 
                />
              </div>

              <div className="flex justify-between py-3">
                <span className="font-mono font-bold text-sm text-[#d8f3dc] uppercase">GRAND TOTAL</span>
                <span className="font-mono font-bold text-lg text-[#52b788]">{sym}{grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <button 
                  onClick={handleSaveDraftClick}
                  className="hex-btn-outline w-full flex items-center justify-center gap-2">
                  <Save size={14} /> SAVE AS DRAFT
                </button>
                <button 
                  onClick={() => sendInvoice()}
                  className="hex-btn-primary w-full flex items-center justify-center gap-2">
                  <Send size={14} /> SEND INVOICE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'preview' && selectedInvoice) {
    return (
      <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
        <div className="flex flex-wrap gap-4 mb-6">
          <button 
            onClick={() => { setView('list'); setSelectedInvoice(null); }}
            className="text-[#52b788] hover:text-[#95d5b2] transition-colors p-2 border border-[#1b4332] bg-[#0d2818]"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          
          <button onClick={handlePrint} className="hex-btn-outline flex items-center gap-2 text-xs">
            <Printer size={14} /> PRINT
          </button>
          <button onClick={handleDownloadPDF} className="hex-btn-outline flex items-center gap-2 text-xs">
            <Download size={14} /> DOWNLOAD PDF
          </button>
          <button onClick={() => markAsPaid(selectedInvoice.id)} className="hex-btn-outline flex items-center gap-2 text-xs border-[#e9c46a] text-[#e9c46a] hover:bg-[#e9c46a] hover:text-[#0a1a0f]">
            <Check size={14} /> MARK AS PAID
          </button>
          <button onClick={() => sendInvoice()} className="hex-btn-primary flex items-center gap-2 text-xs">
            <Mail size={14} /> RESEND EMAIL
          </button>
        </div>

        <div className="bg-[#0a1a0f] p-8 border border-[#1b4332] overflow-x-auto">
          <div className="bg-[#0a1a0f] p-10 min-w-[800px] max-w-2xl mx-auto" id="invoice-print">
            <div className="flex justify-between items-start mb-12 border-b-2 border-[#1b4332] pb-8">
              <div>
                <h1 className="text-4xl font-mono font-bold tracking-widest text-[#52b788] mb-2">HEXIS</h1>
                <p className="text-[#95d5b2] font-mono text-sm tracking-widest">INVOICE SYSTEM</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-mono text-[#d8f3dc] tracking-wider">INVOICE</h2>
                <p className="text-[#95d5b2] font-mono text-sm mt-2">{selectedInvoice.invoice_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <p className="text-xs font-mono font-bold text-[#1b4332] mb-2">BILLED TO</p>
                <p className="text-[#d8f3dc] font-mono font-bold text-lg mb-1">{selectedInvoice.client_name}</p>
                <p className="text-[#95d5b2] font-mono text-sm mb-1">{selectedInvoice.client_email}</p>
                <p className="text-[#95d5b2] font-mono text-sm whitespace-pre-line">{selectedInvoice.client_address}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold text-[#1b4332] mb-2">PAYMENT DETAILS</p>
                <p className="text-[#95d5b2] font-mono text-sm mb-1">Status: <span className="uppercase font-bold text-[#e9c46a]">{selectedInvoice.status}</span></p>
                <p className="text-[#95d5b2] font-mono text-sm mb-1">Issued: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                <p className="text-[#95d5b2] font-mono text-sm">Due: {selectedInvoice.due_date || 'N/A'}</p>
              </div>
            </div>

            <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1b4332]">
                  <th className="py-3 text-left font-mono text-xs text-[#52b788] uppercase">Description</th>
                  <th className="py-3 text-center font-mono text-xs text-[#52b788] uppercase">Qty</th>
                  <th className="py-3 text-right font-mono text-xs text-[#52b788] uppercase">Price</th>
                  <th className="py-3 text-right font-mono text-xs text-[#52b788] uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#0d2818]">
                    <td className="py-4 font-mono text-sm text-[#d8f3dc]">{item.description}</td>
                    <td className="py-4 font-mono text-sm text-[#d8f3dc] text-center">{item.quantity}</td>
                    <td className="py-4 font-mono text-sm text-[#d8f3dc] text-right">{sym}{item.price.toFixed(2)}</td>
                    <td className="py-4 font-mono text-sm text-[#52b788] font-bold text-right">{sym}{(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-12">
              <div className="w-64 space-y-3">
                <div className="flex justify-between font-mono text-sm text-[#95d5b2]">
                  <span>Subtotal</span>
                  <span>{sym}{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-sm text-[#95d5b2] border-b border-[#1b4332] pb-3">
                  <span>Tax ({selectedInvoice.tax_percent}%)</span>
                  <span>{sym}{selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-lg font-bold text-[#52b788] pt-1">
                  <span>Total</span>
                  <span>{sym}{selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mb-12">
                <p className="text-xs font-mono font-bold text-[#1b4332] mb-2">NOTES</p>
                <p className="text-[#95d5b2] font-mono text-sm whitespace-pre-line">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="text-center pt-8 border-t border-[#1b4332] mt-16">
              <p className="font-mono text-xs text-[#1b4332] tracking-widest uppercase">Thank you for your business</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

    return null;
  };

  return (
    <UpgradeGate feature="Invoices" requiredPlan="phantom" enabled={canUse('invoices')}>
      {renderContent()}
    </UpgradeGate>
  );
}
