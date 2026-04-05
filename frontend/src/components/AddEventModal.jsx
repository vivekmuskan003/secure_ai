import React, { useState } from 'react';

export default function AddEventModal({ isOpen, onClose, onSubmit, initialDate }) {
  const [formData, setFormData] = useState({
    summary: '',
    startDate: initialDate || new Date().toISOString().split('T')[0],
    startTime: '10:00',
    duration: '60', // minutes
    description: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`).toISOString();
    const endDateTime = new Date(new Date(startDateTime).getTime() + (parseInt(formData.duration) * 60000)).toISOString();
    
    onSubmit({
      summary: formData.summary,
      startDateTime,
      endDateTime,
      description: formData.description
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 bg-slate-900/90 shadow-2xl border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Create New Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 Transition-all">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Event Title</label>
            <input
              required
              type="text"
              placeholder="e.g. Project Sync"
              className="input-field"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Date</label>
              <input
                required
                type="date"
                className="input-field"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Start Time</label>
              <input
                required
                type="time"
                className="input-field"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Duration (Minutes)</label>
            <select
              className="input-field"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            >
              <option value="15">15 mins</option>
              <option value="30">30 mins</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">All day (8h)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Notes (Optional)</label>
            <textarea
              rows="3"
              placeholder="Any extra details..."
              className="input-field resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Event</button>
          </div>
        </form>
      </div>
    </div>
  );
}
