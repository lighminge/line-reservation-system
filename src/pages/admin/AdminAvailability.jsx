import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvailability, saveAvailability } from '../../services/db';

export default function AdminAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Day settings
  const [daySettings, setDaySettings] = useState({
    isOpen: false,
    purposes: [],
    timeSlots: []
  });

  const [newPurpose, setNewPurpose] = useState('');
  const [newTime, setNewTime] = useState('');

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    setLoading(true);
    const data = await getAvailability(monthStr);
    setAvailability(data);
    setLoading(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Calculate empty padding days for the first week
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  const openModal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    const existing = availability[dateStr];
    if (existing) {
      setDaySettings({
        isOpen: existing.isOpen || false,
        purposes: existing.purposes || [],
        timeSlots: existing.timeSlots || []
      });
    } else {
      setDaySettings({ isOpen: false, purposes: [], timeSlots: [] });
    }
    
    setIsModalOpen(true);
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const existingId = availability[selectedDate]?.id;
      const dataToSave = {
        month: monthStr,
        date: selectedDate,
        ...daySettings
      };
      
      await saveAvailability(existingId, dataToSave);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert("儲存失敗: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = () => {
    if (newTime && !daySettings.timeSlots.includes(newTime)) {
      setDaySettings({
        ...daySettings,
        timeSlots: [...daySettings.timeSlots, newTime].sort()
      });
      setNewTime('');
    }
  };

  const addPurpose = () => {
    if (newPurpose && !daySettings.purposes.includes(newPurpose)) {
      setDaySettings({
        ...daySettings,
        purposes: [...daySettings.purposes, newPurpose]
      });
      setNewPurpose('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約設定</h1>
          <p className="text-slate-500 mt-1">設定每日可預約的時段與項目</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{format(currentMonth, 'yyyy 年 MM 月')}</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6 relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          )}
          
          <div className="grid grid-cols-7 gap-4 mb-4">
            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
              <div key={day} className="text-center font-semibold text-slate-400 text-sm">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-4">
            {paddingDays.map(i => (
              <div key={`padding-${i}`} className="min-h-[100px] rounded-xl bg-slate-50/50" />
            ))}
            
            {days.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const settings = availability[dateStr];
              const isOpen = settings?.isOpen;

              return (
                <button
                  key={date.toString()}
                  onClick={() => openModal(date)}
                  className={cn(
                    "min-h-[100px] p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative hover:shadow-md hover:-translate-y-0.5 text-left",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200",
                    isOpen ? "bg-green-50/50 hover:bg-green-50 border-green-200" : "bg-white hover:bg-slate-50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold mb-2",
                    isToday(date) ? "text-green-600" : "text-slate-700"
                  )}>
                    {format(date, 'd')}
                  </span>
                  
                  {isOpen ? (
                    <div className="flex flex-col space-y-1 w-full mt-auto">
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded truncate">
                        {settings.timeSlots.length} 個時段
                      </div>
                      <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded truncate">
                        {settings.purposes.length} 個項目
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-auto px-1">未開放</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">
                設定預約日：{selectedDate}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl">
                <input 
                  type="checkbox" 
                  id="isOpen"
                  checked={daySettings.isOpen}
                  onChange={(e) => setDaySettings({...daySettings, isOpen: e.target.checked})}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="isOpen" className="font-semibold text-slate-700 cursor-pointer">
                  開放此日預約
                </label>
              </div>

              {daySettings.isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                  {/* Time Slots */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">開放時段</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {daySettings.timeSlots.length === 0 && <p className="text-sm text-slate-400">尚未新增時段</p>}
                      {daySettings.timeSlots.map(time => (
                        <div key={time} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm font-medium border border-slate-200">
                          <span>{time}</span>
                          <button 
                            onClick={() => setDaySettings({
                              ...daySettings,
                              timeSlots: daySettings.timeSlots.filter(t => t !== time)
                            })}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        type="time" 
                        value={newTime} 
                        onChange={e => setNewTime(e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500"
                      />
                      <button onClick={addTimeSlot} className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-lg flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Purposes */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">預約項目 / 目的</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {daySettings.purposes.length === 0 && <p className="text-sm text-slate-400">尚未新增項目</p>}
                      {daySettings.purposes.map(purpose => (
                        <div key={purpose} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm font-medium border border-slate-200">
                          <span>{purpose}</span>
                          <button 
                            onClick={() => setDaySettings({
                              ...daySettings,
                              purposes: daySettings.purposes.filter(p => p !== purpose)
                            })}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        value={newPurpose} 
                        onChange={e => setNewPurpose(e.target.value)}
                        placeholder="輸入新項目 (例：洗髮)"
                        className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500"
                        onKeyPress={(e) => e.key === 'Enter' && addPurpose()}
                      />
                      <button onClick={addPurpose} className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-lg flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex space-x-3 bg-slate-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
                取消
              </button>
              <button 
                onClick={handleSaveDay} 
                disabled={saving} 
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl shadow-md transition-colors flex justify-center items-center disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存設定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
