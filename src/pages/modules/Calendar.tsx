import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, X, Trash2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import TimePicker from '../../components/ui/TimePicker';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  color: string;
  user_id: string;
}

export default function CalendarModule() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState('#52b788');
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (!user?.id) return;
    
    fetchEvents();
    
    const channel = supabase
      .channel('module-calendar_events-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchEvents();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching calendar events', error);
      return;
    }

    if (data) {
      setEvents(
        data.map((e: any) => ({
          ...e,
          start: e.start_time ? new Date(e.start_time) : new Date(e.event_date),
          end: e.end_time ? new Date(e.end_time) : new Date(e.event_date),
          allDay: e.is_all_day ?? false,
          color: e.color ?? '#52b788',
        }))
      );
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const isSingleDay = start.toDateString() === end.toDateString() || end.getTime() - start.getTime() <= 86400000;
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(isSingleDay ? start : new Date(end.getTime() - 1), 'yyyy-MM-dd'));
    
    if (start.getHours() === 0 && start.getMinutes() === 0) {
      setStartTime('09:00');
      setEndTime('10:00');
      setIsAllDay(true);
    } else {
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
      setIsAllDay(false);
    }
    
    setTitle('');
    setColor('#52b788');
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setStartDate(format(event.start, 'yyyy-MM-dd'));
    setStartTime(format(event.start, 'HH:mm'));
    setEndDate(format(event.end, 'yyyy-MM-dd'));
    setEndTime(format(event.end, 'HH:mm'));
    setIsAllDay(event.allDay);
    setColor(event.color);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let start = new Date(`${startDate}T${startTime}`);
    let end = new Date(`${endDate}T${endTime}`);

    if (isAllDay) {
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    }

    const payload = {
      user_id: user.id,
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_all_day: isAllDay,
      color,
      event_date: start.toISOString(),
    };

    if (selectedEvent) {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(payload)
        .eq('id', selectedEvent.id)
        .select();
        
      if (error) {
        console.error("Error updating event:", error);
      } else {
        fetchEvents();
      }
    } else {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([payload])
        .select();
        
      if (error) {
        console.error("Error creating event:", error);
      } else if (data && data.length > 0) {
        setEvents(prev => [...prev, {
          ...data[0],
          start: new Date(data[0].start_time),
          end: new Date(data[0].end_time),
          allDay: data[0].is_all_day,
        }]);
      } else {
        fetchEvents();
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', selectedEvent.id);
    if (!error) {
      fetchEvents();
      setIsModalOpen(false);
    }
  };

  const eventPropGetter = (event: any) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '2px',
        opacity: 0.9,
        color: '#0d2818',
        border: '0px',
        display: 'block',
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 'bold',
      },
    };
  };

  return (
    <div className="h-full flex flex-col bg-[#0a1a0f] p-4 md:p-6 text-[#d8f3dc] font-mono">
      <div className="flex items-center justify-between mb-6 border-b border-[#1b4332] pb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-[#52b788]" />
          <h1 className="text-xl tracking-widest font-bold text-[#52b788]">CALENDAR</h1>
        </div>
        <button
          onClick={() => {
            const now = new Date();
            setStartDate(format(now, 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
            setStartTime(format(now, 'HH:mm'));
            setEndTime(format(new Date(now.getTime() + 3600000), 'HH:mm'));
            setIsAllDay(false);
            setTitle('');
            setColor('#52b788');
            setSelectedEvent(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-[#d8f3dc] px-4 py-2 text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          ADD EVENT
        </button>
      </div>

      <div className="flex-1 bg-[#0d2818] border border-[#1b4332] p-4 relative calendar-container">
        <style>{`
          .calendar-container .rbc-calendar {
            font-family: monospace;
          }
          .calendar-container .rbc-header {
            padding: 8px 0;
            background: #123620;
            color: #52b788;
            border-bottom: 1px solid #1b4332;
            border-left: 1px solid #1b4332;
            font-weight: normal;
          }
          .calendar-container .rbc-header + .rbc-header {
            border-left: 1px solid #1b4332;
          }
          .calendar-container .rbc-month-view,
          .calendar-container .rbc-time-view,
          .calendar-container .rbc-agenda-view {
            border: 1px solid #1b4332;
            background: #0d2818;
          }
          .calendar-container .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid #1b4332;
          }
          .calendar-container .rbc-month-row + .rbc-month-row {
            border-top: 1px solid #1b4332;
          }
          .calendar-container .rbc-day-bg {
            transition: background-color 0.2s;
          }
          .calendar-container .rbc-day-bg:hover {
            background-color: #123620;
          }
          .calendar-container .rbc-today {
            background-color: #1a4a2e;
          }
          .calendar-container .rbc-off-range-bg {
            background-color: #0a1a0f;
          }
          .calendar-container .rbc-date-cell {
            padding: 4px 8px;
            color: #95d5b2;
          }
          .calendar-container .rbc-off-range {
            color: #2d6a4f;
          }
          .calendar-container .rbc-event {
            padding: 2px 4px;
          }
          .calendar-container .rbc-toolbar button {
            color: #52b788;
            border: 1px solid #1b4332;
            background: #0a1a0f;
            border-radius: 0;
            font-family: monospace;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 1px;
          }
          .calendar-container .rbc-toolbar button:hover {
            background: #1b4332;
          }
          .calendar-container .rbc-toolbar button.rbc-active {
            background: #2d6a4f;
            color: #d8f3dc;
            border-color: #52b788;
          }
          .calendar-container .rbc-toolbar .rbc-toolbar-label {
            color: #d8f3dc;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .calendar-container .rbc-time-content {
            border-top: 1px solid #1b4332;
          }
          .calendar-container .rbc-time-header-content {
            border-left: 1px solid #1b4332;
          }
          .calendar-container .rbc-timeslot-group {
            border-bottom: 1px solid #1b4332;
          }
          .calendar-container .rbc-time-gutter .rbc-timeslot-group {
            border-right: 1px solid #1b4332;
            color: #52b788;
          }
          .calendar-container .rbc-time-header.rbc-overflowing {
            border-right: 1px solid #1b4332;
          }
        `}</style>
        
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day']}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d2818] border border-[#52b788] w-full max-w-md shadow-2xl shadow-[#52b788]/20 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-[#1b4332] bg-[#123620]">
              <h2 className="text-[#52b788] font-bold tracking-widest text-sm">
                {selectedEvent ? 'EDIT EVENT' : 'NEW EVENT'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#52b788] hover:text-[#d8f3dc]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">EVENT TITLE</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0a1a0f] border border-[#1b4332] focus:border-[#52b788] outline-none text-[#d8f3dc] px-3 py-2 text-sm transition-colors"
                  placeholder="e.g., SYSTEM MAINTENANCE"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="accent-[#52b788] w-4 h-4 bg-[#0a1a0f] border-[#1b4332]"
                />
                <label htmlFor="allDay" className="text-xs text-[#95d5b2] tracking-wider cursor-pointer">ALL DAY EVENT</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">START DATE</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1b4332]
                      text-[#52b788] font-mono text-sm px-4 py-3
                      outline-none focus:border-[#52b788]
                      focus:ring-1 focus:ring-[#52b788]
                      [color-scheme:dark] cursor-pointer
                      transition-colors duration-200"
                  />
                </div>
                {!isAllDay && (
                  <div>
                    <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">START TIME</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#0a1a0f] border border-[#1b4332]
                        text-[#52b788] font-mono text-sm px-4 py-3
                        outline-none focus:border-[#52b788]
                        focus:ring-1 focus:ring-[#52b788]
                        [color-scheme:dark] cursor-pointer
                        transition-colors duration-200"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">END DATE</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#0a1a0f] border border-[#1b4332]
                      text-[#52b788] font-mono text-sm px-4 py-3
                      outline-none focus:border-[#52b788]
                      focus:ring-1 focus:ring-[#52b788]
                      [color-scheme:dark] cursor-pointer
                      transition-colors duration-200"
                  />
                </div>
                {!isAllDay && (
                  <div>
                    <label className="block text-xs text-[#95d5b2] mb-1 tracking-wider">END TIME</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#0a1a0f] border border-[#1b4332]
                        text-[#52b788] font-mono text-sm px-4 py-3
                        outline-none focus:border-[#52b788]
                        focus:ring-1 focus:ring-[#52b788]
                        [color-scheme:dark] cursor-pointer
                        transition-colors duration-200"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#95d5b2] mb-2 tracking-wider">COLOR DESIGNATION</label>
                <div className="flex gap-2">
                  {['#52b788', '#e63946', '#457b9d', '#f4a261', '#9d4edd', '#2a9d8f'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 border ${color === c ? 'border-white scale-110' : 'border-transparent'} transition-all`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[#1b4332] bg-[#123620] flex justify-between">
              {selectedEvent ? (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-[#e63946] hover:bg-[#1a0000] px-3 py-1.5 border border-transparent hover:border-[#e63946] text-xs uppercase transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  DELETE
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs tracking-wider text-[#95d5b2] hover:text-[#d8f3dc] uppercase transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-xs tracking-wider bg-[#52b788] text-[#0d2818] hover:bg-[#74c69d] font-bold uppercase transition-colors"
                >
                  {selectedEvent ? 'UPDATE' : 'SAVE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
