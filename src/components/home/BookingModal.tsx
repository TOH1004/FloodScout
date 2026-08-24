import { useState } from 'react';
import { X, Calendar, Users, Clock, CheckCircle } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [experience, setExperience] = useState('lounge');
  const [date, setDate] = useState('2026-08-25');
  const [time, setTime] = useState('12:00 PM');
  const [guests, setGuests] = useState('2 Guests');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E172E]/70 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="relative w-full max-w-xl bg-[#FAF7F2] border border-[#E6DFD5] shadow-2xl p-8 md:p-10 text-[#162244] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#162244]/60 hover:text-[#162244] transition-colors p-1"
          aria-label="Close modal"
        >
          <X size={22} strokeWidth={1.5} />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#BED6EE]/40 text-[#162244] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-editorial-serif text-2xl tracking-[0.15em] uppercase font-medium mb-3">
              Reservation Confirmed
            </h3>
            <p className="font-script text-3xl text-[#162244] mb-4">
              La Dolce Vita awaits you
            </p>
            <p className="text-xs text-[#162244]/70 max-w-md mx-auto leading-relaxed mb-8">
              Thank you, {name || 'valued guest'}. A confirmation dossier and itinerary details have been sent to{' '}
              <span className="font-semibold text-[#162244]">{email || 'your email'}</span>.
            </p>
            <button
              onClick={handleReset}
              className="bg-[#162244] text-[#FAF7F2] px-8 py-3 rounded-full text-[11px] tracking-[0.25em] uppercase hover:bg-[#0E172E] transition-colors font-medium shadow-md"
            >
              Return to Experience
            </button>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <span className="font-script text-3xl md:text-4xl text-[#162244] block mb-1">
                Marble Blue
              </span>
              <h2 className="font-editorial-serif text-xl md:text-2xl tracking-[0.2em] uppercase font-medium text-[#162244]">
                Reserve Your Experience
              </h2>
              <div className="w-12 h-[1px] bg-[#162244]/30 mx-auto mt-3"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {/* Experience Tabs */}
              <div>
                <label className="block text-[10px] tracking-[0.25em] uppercase text-[#162244]/70 font-semibold mb-2">
                  Select Experience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'lounge', label: 'Beach Lounge' },
                    { id: 'dine', label: 'Coastal Dining' },
                    { id: 'cabana', label: 'VIP Cabana' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setExperience(tab.id)}
                      className={`py-2.5 px-2 text-[11px] tracking-[0.15em] uppercase border transition-all text-center ${
                        experience === tab.id
                          ? 'bg-[#162244] text-white border-[#162244]'
                          : 'bg-white/60 text-[#162244]/80 border-[#E6DFD5] hover:border-[#162244]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid 2-col inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162244]/70 font-semibold mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} /> Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] focus:outline-none focus:border-[#162244]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162244]/70 font-semibold mb-1.5 flex items-center gap-1.5">
                    <Clock size={13} /> Time Slot
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] focus:outline-none focus:border-[#162244]"
                  >
                    <option>10:00 AM - Morning Sunbed</option>
                    <option>12:30 PM - Lunch & Wine</option>
                    <option>04:00 PM - Sunset Aperitivo</option>
                    <option>08:00 PM - Dinner by the Sea</option>
                    <option>10:30 PM - Moonlight Cocktails</option>
                  </select>
                </div>
              </div>

              {/* Guests Selection */}
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#162244]/70 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Users size={13} /> Party Size
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] focus:outline-none focus:border-[#162244]"
                >
                  <option>1 Guest</option>
                  <option>2 Guests</option>
                  <option>3 - 4 Guests</option>
                  <option>5 - 8 Guests (Group)</option>
                  <option>Private Event (8+ Guests)</option>
                </select>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] placeholder-[#162244]/40 focus:outline-none focus:border-[#162244]"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] placeholder-[#162244]/40 focus:outline-none focus:border-[#162244]"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone / WhatsApp"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-[#E6DFD5] px-3.5 py-2.5 text-xs text-[#162244] placeholder-[#162244]/40 focus:outline-none focus:border-[#162244]"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-[#162244] text-[#FAF7F2] py-3.5 rounded-full text-xs font-semibold tracking-[0.25em] uppercase hover:bg-[#0E172E] transition-all shadow-md active:scale-[0.99]"
                >
                  Complete Reservation
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
