import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const knownIds = useRef(new Set<string>())

  const fetchNotifications = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      
    // Fetch system announcements
    let annData = [];
    const { data: directData, error: directError } = await supabase
      .from('system_announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (directError || !directData) {
      const { data: rpcData } = await supabase.rpc('get_active_announcements');
      if (rpcData) annData = rpcData;
    } else {
      annData = directData;
    }

    const readAnns = JSON.parse(localStorage.getItem('read_announcements') || '[]');
    
    const formattedAnns = (annData || [])
      .map((a: any) => ({
        id: a.id,
        type: 'announcement',
        title: 'BROADCAST: ' + a.title,
        message: a.message,
        created_at: a.created_at,
        read: readAnns.includes(a.id),
        announcementType: a.type
      }));

    const combined = [...(data || []), ...formattedAnns].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    combined.forEach(n => knownIds.current.add(n.id));

    setNotifications(combined)
    setUnreadCount(combined.filter((n: any) => !n.read).length)
  }

  const markAllRead = async () => {
    if (!user?.id) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
    setUnreadCount(0)
  }

  const markRead = async (id: string) => {
    const isAnn = notifications.find(n => n.id === id)?.type === 'announcement';
    if (isAnn) {
      const readAnns = JSON.parse(localStorage.getItem('read_announcements') || '[]');
      if (!readAnns.includes(id)) {
        localStorage.setItem('read_announcements', JSON.stringify([...readAnns, id]));
      }
    } else {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
    }
    
    setNotifications(prev => 
      prev.map(n => n.id === id 
        ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()
    
    const channel = supabase
      .channel('notifications-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
        // Browser notification if permitted
        if (
          typeof Notification !== 'undefined' && 
          Notification.permission === 'granted'
        ) {
          new Notification('HEXIS: ' + payload.new.title, {
            body: payload.new.message,
          })
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_announcements'
      }, (payload) => {
        const ann = payload.new;
        if (!ann.active) return;
        if (knownIds.current.has(ann.id)) return;
        knownIds.current.add(ann.id);

        const formatted = {
          id: ann.id,
          type: 'announcement',
          title: 'BROADCAST: ' + ann.title,
          message: ann.message,
          created_at: ann.created_at,
          read: false,
          announcementType: ann.type
        };
        setNotifications(prev => [formatted, ...prev])
        setUnreadCount(prev => prev + 1)
        toast.success(ann.title, { icon: '📢', duration: 5000 });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('HEXIS BROADCAST: ' + ann.title, { body: ann.message })
        }
      })
      .subscribe()
    
    // Fallback: Poll for announcements every 10 seconds in case websocket fails
    const pollInterval = setInterval(async () => {
      let annData = [];
      const { data: directData, error: directError } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (directError || !directData) {
        const { data: rpcData } = await supabase.rpc('get_active_announcements');
        if (rpcData) annData = rpcData;
      } else {
        annData = directData;
      }

      const readAnns = JSON.parse(localStorage.getItem('read_announcements') || '[]');
      const formattedAnns = (annData || []).map((a: any) => ({
        id: a.id,
        type: 'announcement',
        title: 'BROADCAST: ' + a.title,
        message: a.message,
        created_at: a.created_at,
        read: readAnns.includes(a.id),
        announcementType: a.type
      }));

      const newAnns = formattedAnns.filter((fa: any) => !knownIds.current.has(fa.id));
      if (newAnns.length > 0) {
        newAnns.forEach((ann: any) => {
           knownIds.current.add(ann.id);
           toast.success(ann.title.replace('BROADCAST: ', ''), { icon: '📢', duration: 5000 });
        });
        setNotifications(prev => {
          const combined = [...prev, ...newAnns].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setTimeout(() => setUnreadCount(combined.filter((n: any) => !n.read).length), 0);
          return combined;
        });
      }
    }, 10000);

    return () => { 
      channel.unsubscribe();
      clearInterval(pollInterval);
    }
  }, [user?.id])

  return { 
    notifications, 
    unreadCount, 
    markRead, 
    markAllRead,
    refetch: fetchNotifications
  }
}
