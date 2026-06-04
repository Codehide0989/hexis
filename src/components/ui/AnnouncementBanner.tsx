import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Info, AlertTriangle, AlertOctagon } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'danger'
  active: boolean
  expires_at: string | null
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = 
    useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = 
    useState(0)
  const [dismissed, setDismissed] = useState<
    string[]
  >(() => {
    try {
      return JSON.parse(
        localStorage.getItem('hexis_dismissed_announcements') 
        || '[]'
      )
    } catch { return [] }
  })

  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(
      fetchAnnouncements, 5 * 60 * 1000
    )
    return () => clearInterval(interval)
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('active', true)
        .or('expires_at.is.null,expires_at.gt.' + 
          new Date().toISOString())
        .order('created_at', { ascending: false })
      
      if (data) setAnnouncements(data)
    } catch {
      // Silent fail — announcements are optional
    }
  }

  const dismissAnnouncement = (id: string) => {
    const updated = [...dismissed, id]
    setDismissed(updated)
    localStorage.setItem(
      'hexis_dismissed_announcements',
      JSON.stringify(updated)
    )
  }

  const visible = announcements.filter(
    a => !dismissed.includes(a.id)
  )

  if (visible.length === 0) return null

  const current = visible[currentIndex] || visible[0]
  
  const typeConfig = {
    info: {
      bg: 'bg-[#0d2818]',
      border: 'border-[#52b788]',
      text: 'text-[#d8f3dc]',
      icon: <Info size={14} className="text-[#52b788] flex-shrink-0" />
    },
    warning: {
      bg: 'bg-[#1a1400]',
      border: 'border-[#e9c46a]',
      text: 'text-[#fefae0]',
      icon: <AlertTriangle size={14} className="text-[#e9c46a] flex-shrink-0" />
    },
    danger: {
      bg: 'bg-[#1a0000]',
      border: 'border-[#e63946]',
      text: 'text-[#ffe8e8]',
      icon: <AlertOctagon size={14} className="text-[#e63946] flex-shrink-0" />
    }
  }

  const config = typeConfig[current.type]

  return (
    <div className={`
      ${config.bg} ${config.text}
      border-l-4 ${config.border}
      flex items-center gap-3 
      px-4 py-2.5 text-xs
      border-b border-[#1b4332]
    `}>
      {config.icon}
      <span className="font-mono font-bold 
        uppercase tracking-wider flex-shrink-0">
        {current.title}:
      </span>
      <span className="font-sans flex-1 truncate">
        {current.message}
      </span>
      {visible.length > 1 && (
        <button 
          onClick={() => setCurrentIndex(
            (currentIndex + 1) % visible.length
          )}
          className="font-mono text-[10px] 
            flex-shrink-0 opacity-60 
            hover:opacity-100">
          {currentIndex + 1}/{visible.length} ▸
        </button>
      )}
      <button 
        onClick={() => dismissAnnouncement(current.id)}
        className="flex-shrink-0 opacity-60 
          hover:opacity-100 ml-1">
        <X size={12} />
      </button>
    </div>
  )
}
