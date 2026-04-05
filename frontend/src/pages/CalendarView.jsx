import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  fetchCalendarEvents, 
  getServiceStatus, 
  updatePreferences, 
  createCalendarEvent, 
  deleteCalendarEvent 
} from '../services/api';
import SidebarChat from '../components/SidebarChat';
import AddEventModal from '../components/AddEventModal';
import { useTheme } from '../context/ThemeContext';

export default function CalendarView() {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  
  const [events, setEvents] = useState([]);
  const [importantEvents, setImportantEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation State
  const [viewDate, setViewDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadData = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const [calendarRes, statusRes] = await Promise.all([
        fetchCalendarEvents(token),
        getServiceStatus(token)
      ]);
      
      setEvents(calendarRes.events);
      setImportantEvents(statusRes.user?.importantEvents || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Google Calendar not connected. Please connect from Services page.');
      } else {
        setError(err.message || 'Failed to fetch calendar');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [getToken]);

  const handleAddEvent = async (eventData) => {
    try {
      const token = getToken();
      await createCalendarEvent(token, eventData);
      setIsAddModalOpen(false);
      loadData(); // Refresh
    } catch (err) {
      alert('Failed to create event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const token = getToken();
      await deleteCalendarEvent(token, eventId);
      setSelectedEvent(null);
      loadData(); // Refresh
    } catch (err) {
      alert('Failed to delete event: ' + err.message);
    }
  };

  const toggleImportEvent = async (eventId) => {
    const isImportant = importantEvents.includes(eventId);
    const action = isImportant ? 'remove' : 'add';
    try {
      const token = getToken();
      const res = await updatePreferences(token, { action, type: 'event', value: eventId });
      setImportantEvents(res.importantEvents);
    } catch (err) {
      console.error('Failed to update event importance:', err);
    }
  };

  // ── Calendar Grid Logic ───────────────────────────────────────────────────
  
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];
    
    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year, currentMonth: false });
    }
    
    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, currentMonth: true });
    }
    
    // Next month's leading days
    const totalSlots = 42; // 6 rows * 7 days
    const nextDaysNeeded = totalSlots - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      days.push({ day: i, month: month + 1, year, currentMonth: false });
    }
    
    return days;
  }, [viewDate]);

  const getEventsForDate = (d, m, y) => {
    return events.filter(evt => {
      const start = new Date(evt.start?.dateTime || evt.start?.date);
      return start.getDate() === d && start.getMonth() === m && start.getFullYear() === y;
    });
  };

  const changeMonth = (offset) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Main Calendar Grid (3/4 width) */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in mb-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center border border-accent-primary/20 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-accent-primary" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-main">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h1>
                <p className="text-muted text-[11px]">Manage your events and upcoming festivals.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-surface-glass rounded-xl p-1 border border-border-glass">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-main transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setViewDate(new Date())} className="px-3 py-1 text-xs font-semibold text-muted hover:text-main transition-all border-x border-border-glass">Today</button>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-main transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <button 
                onClick={() => { setSelectedDay(new Date().toISOString().split('T')[0]); setIsAddModalOpen(true); }}
                className="btn-primary flex items-center gap-2 text-sm px-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add Event
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="glass-card bg-red-500/5 border-red-500/20 text-red-500 p-8 rounded-2xl text-center">
              <p className="font-medium">{error}</p>
              <button onClick={() => window.location.href='/services'} className="mt-4 text-xs underline">Go to Services</button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-border-glass">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted opacity-60">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 grid-rows-6 h-[600px]">
                {calendarData.map((slot, idx) => {
                  const dayEvents = getEventsForDate(slot.day, slot.month, slot.year);
                  const isToday = new Date().toDateString() === new Date(slot.year, slot.month, slot.day).toDateString();
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        if (dayEvents.length === 0) {
                          setSelectedDay(`${slot.year}-${String(slot.month + 1).padStart(2, '0')}-${String(slot.day).padStart(2, '0')}`);
                          setIsAddModalOpen(true);
                        }
                      }}
                      className={`relative p-1.5 border-r border-b border-border-glass group transition-all cursor-pointer bg-white/[0.01] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] ${!slot.currentMonth ? 'opacity-30' : ''}`}
                    >
                      <span className={`text-[13px] font-bold inline-block w-6 h-6 leading-6 text-center rounded-lg transition-all ${isToday ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/30' : 'text-muted group-hover:text-main'}`}>
                        {slot.day}
                      </span>
                      
                      <div className="mt-1 space-y-0.5 overflow-hidden h-[75px]">
                        {dayEvents.map(evt => {
                          const isHoliday = evt.isHoliday;
                          const isImp = importantEvents.includes(evt.id);
                          
                          return (
                            <div 
                              key={evt.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                              className={`text-[10px] px-2 py-0.5 rounded border truncate transition-all ${
                                isHoliday 
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 font-bold' 
                                  : isImp
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 font-bold'
                                  : 'bg-teal-500/10 border-teal-500/20 text-teal-500'
                              } hover:scale-[1.02] hover:shadow-sm`}
                            >
                              {evt.summary || 'Untitled'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Chat (1/4 width) */}
        <div className="lg:w-[380px] flex-shrink-0">
          <div className="sticky top-24">
             <SidebarChat service="calendar" />
          </div>
        </div>

      </div>

      {/* Legend */}
      <div className="max-w-[1600px] mx-auto mt-6 flex items-center gap-6 px-2 text-[10px] uppercase font-bold text-muted tracking-widest opacity-80 animate-fade-in animation-delay-300">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div> Standard</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Important</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Festivals</div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-sm p-5 bg-bg-primary shadow-2xl border-border-glass">
            <h3 className="text-lg font-bold text-main mb-1">{selectedEvent.summary}</h3>
            <p className="text-muted text-xs mb-3">{new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date).toLocaleString()}</p>
            {selectedEvent.description && <p className="text-main/80 text-[11px] mb-5 italic border-l-2 border-accent-primary pl-3">"{selectedEvent.description}"</p>}
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => toggleImportEvent(selectedEvent.id)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${importantEvents.includes(selectedEvent.id) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}
              >
                {importantEvents.includes(selectedEvent.id) ? '★ Marked Important' : '☆ Mark as Important'}
              </button>
              
              {!selectedEvent.isHoliday && (
                <button 
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold Transition-all"
                >
                  Delete Event
                </button>
              )}
              
              <button onClick={() => setSelectedEvent(null)} className="btn-ghost py-2 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      <AddEventModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddEvent}
        initialDate={selectedDay}
      />
    </div>
  );
}
