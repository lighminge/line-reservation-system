import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Plus, Clock, Users, BookOpen, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvailability, saveAvailability, getDictionary, saveDictionary, getAdminReservations } from '../../services/db';

export default function AdminAvailability() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [reservations, setReservations] = useState([]);
  const [purposesDict, setPurposesDict] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Day settings
  const [daySettings, setDaySettings] = useState({ isOpen: false, slots: [] });

  // Slot Edit state
  const [editingSlotIndex, setEditingSlotIndex] = useState(-1);
  const [slotForm, setSlotForm] = useState({
    ampm: 'AM',
    hour: '10',
    minute: '00',
    purposes: [],
    maxCapacity: -1 // -1 means unlimited
  });

  // Dictionary management
  const [showDictManager, setShowDictManager] = useState(false);
  const [newDictWord, setNewDictWord] = useState('');

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    setLoading(true);
    const [availData, dictData, resData] = await Promise.all([
      getAvailability(monthStr),
      getDictionary('purposes'),
      getAdminReservations()
    ]);
    setAvailability(availData);
    setPurposesDict(dictData);
    setReservations(resData);
    setLoading(false);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  const openModal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    const existing = availability[dateStr];
    if (existing) {
      setDaySettings({
        isOpen: existing.isOpen || false,
        // map legacy timeSlots to new slots array if needed
        slots: existing.slots || (existing.timeSlots || []).map(t => ({
          time: t,
          purposes: existing.purposes || [],
          maxCapacity: -1
        }))
      });
    } else {
      setDaySettings({ isOpen: false, slots: [] });
    }
    resetSlotForm();
    setIsModalOpen(true);
  };

  const resetSlotForm = () => {
    setEditingSlotIndex(-1);
    setSlotForm({ ampm: 'AM', hour: '10', minute: '00', purposes: [], maxCapacity: -1 });
  };

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const existingId = availability[selectedDate]?.id;
      const dataToSave = { month: monthStr, date: selectedDate, ...daySettings };
      await saveAvailability(existingId, dataToSave);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert("儲存失敗: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlot = () => {
    if (slotForm.purposes.length === 0) {
      alert("請至少選擇一個預約目的");
      return;
    }
    
    // Convert 12hr to 24hr string
    let h = parseInt(slotForm.hour);
    if (slotForm.ampm === 'PM' && h !== 12) h += 12;
    if (slotForm.ampm === 'AM' && h === 12) h = 0;
    const timeStr = `${h.toString().padStart(2, '0')}:${slotForm.minute}`;

    const newSlot = {
      time: timeStr,
      purposes: slotForm.purposes,
      maxCapacity: slotForm.maxCapacity
    };

    let newSlots = [...daySettings.slots];
    if (editingSlotIndex >= 0) {
      newSlots[editingSlotIndex] = newSlot;
    } else {
      // Check if time already exists
      if (newSlots.some(s => s.time === timeStr)) {
        alert("該時段已存在");
        return;
      }
      newSlots.push(newSlot);
    }
    
    // Sort slots by time
    newSlots.sort((a, b) => a.time.localeCompare(b.time));
    
    setDaySettings({ ...daySettings, slots: newSlots });
    resetSlotForm();
  };

  const editSlot = (index) => {
    const slot = daySettings.slots[index];
    const [hStr, mStr] = slot.time.split(':');
    let h = parseInt(hStr);
    let ampm = 'AM';
    if (h >= 12) { ampm = 'PM'; if (h > 12) h -= 12; }
    if (h === 0) h = 12;

    setSlotForm({
      ampm,
      hour: h.toString(),
      minute: mStr,
      purposes: slot.purposes || [],
      maxCapacity: slot.maxCapacity !== undefined ? slot.maxCapacity : -1
    });
    setEditingSlotIndex(index);
  };

  const deleteSlot = (index, e) => {
    e.stopPropagation(); // prevent opening edit
    const slot = daySettings.slots[index];
    
    // Check for existing reservations
    const hasReservation = reservations.some(r => r.date === selectedDate && r.time === slot.time);
    if (hasReservation) {
      alert("該時段已有客戶預約，無法刪除！");
      return;
    }
    
    if (window.confirm(`確定要刪除 ${slot.time} 時段嗎？`)) {
      const newSlots = [...daySettings.slots];
      newSlots.splice(index, 1);
      setDaySettings({ ...daySettings, slots: newSlots });
      if (editingSlotIndex === index) resetSlotForm();
    }
  };

  const togglePurpose = (purpose) => {
    const p = [...slotForm.purposes];
    const idx = p.indexOf(purpose);
    if (idx >= 0) p.splice(idx, 1);
    else p.push(purpose);
    setSlotForm({ ...slotForm, purposes: p });
  };

  // Dict management
  const addDictWord = async () => {
    if (newDictWord && !purposesDict.includes(newDictWord)) {
      const newDict = [...purposesDict, newDictWord];
      await saveDictionary('purposes', newDict);
      setPurposesDict(newDict);
      setNewDictWord('');
    }
  };
  const removeDictWord = async (word) => {
    if (window.confirm(`確定要從辭庫刪除「${word}」嗎？`)) {
      const newDict = purposesDict.filter(w => w !== word);
      await saveDictionary('purposes', newDict);
      setPurposesDict(newDict);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">預約設定</h1>
          <p className="text-slate-500 mt-1">設定每日可預約的時段、項目與人數上限</p>
        </div>
        <button 
          onClick={() => setShowDictManager(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors shadow-sm"
        >
          <BookOpen className="w-5 h-5" />
          <span>管理常用辭庫</span>
        </button>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{format(currentMonth, 'yyyy 年 MM 月')}</h2>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="p-6 relative min-h-[500px]">
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

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {paddingDays.map(i => <div key={`padding-${i}`} className="min-h-[140px] rounded-xl bg-slate-50/50" />)}
            
            {days.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const settings = availability[dateStr];
              const isOpen = settings?.isOpen;

              return (
                <div
                  key={date.toString()}
                  onClick={() => openModal(date)}
                  className={cn(
                    "min-h-[140px] p-2 md:p-3 rounded-xl border transition-all duration-200 flex flex-col items-start relative hover:shadow-md cursor-pointer",
                    isToday(date) ? "border-green-400 ring-1 ring-green-400" : "border-slate-200 hover:border-green-300",
                    isOpen ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <span className={cn("text-sm font-bold mb-2", isToday(date) ? "text-green-600" : "text-slate-700")}>
                    {format(date, 'd')}
                  </span>
                  
                  {isOpen ? (
                    <div className="flex flex-col gap-1 w-full mt-1">
                      {settings.slots?.map(s => (
                        <div key={s.time} className="text-[10px] md:text-xs bg-green-500 text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate">
                          {s.time}
                        </div>
                      ))}
                      {(!settings.slots || settings.slots.length === 0) && (
                        <div className="text-[10px] md:text-xs text-amber-600 bg-amber-50 px-1 py-1 rounded text-center">無時段</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] md:text-xs text-slate-400 mt-auto px-1">未開放</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                設定預約：{selectedDate}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <input 
                  type="checkbox" 
                  id="isOpen"
                  checked={daySettings.isOpen}
                  onChange={(e) => setDaySettings({...daySettings, isOpen: e.target.checked})}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="isOpen" className="font-bold text-slate-700 cursor-pointer select-none">
                  開放此日預約
                </label>
              </div>

              {daySettings.isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 fade-in duration-300">
                  
                  {/* Left Column: Created Slots */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" /> 已建立時段
                    </h3>
                    <div className="space-y-3">
                      {daySettings.slots.length === 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl text-slate-400 text-sm text-center border border-slate-100">
                          尚未新增任何時段
                        </div>
                      )}
                      {daySettings.slots.map((slot, idx) => (
                        <div 
                          key={slot.time}
                          onClick={() => editSlot(idx)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer relative group",
                            editingSlotIndex === idx ? "bg-green-50 border-green-400 shadow-sm" : "bg-white border-slate-200 hover:border-green-300 hover:shadow-md"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg text-slate-800">{slot.time}</span>
                            <button 
                              onClick={(e) => deleteSlot(idx, e)}
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {slot.purposes.map(p => (
                              <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{p}</span>
                            ))}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            上限：{slot.maxCapacity === -1 ? '無限制' : `${slot.maxCapacity} 人`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Slot Form */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center text-green-700">
                      {editingSlotIndex >= 0 ? '✏️ 編輯時段' : '✨ 新增時段'}
                    </h3>
                    
                    <div className="space-y-5">
                      {/* Time Pickers */}
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">選擇時間</label>
                        <div className="flex space-x-2">
                          <select 
                            value={slotForm.ampm} onChange={e => setSlotForm({...slotForm, ampm: e.target.value})}
                            className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                          >
                            <option value="AM">上午</option>
                            <option value="PM">下午</option>
                          </select>
                          <select 
                            value={slotForm.hour} onChange={e => setSlotForm({...slotForm, hour: e.target.value})}
                            className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                          >
                            {Array.from({length: 12}, (_, i) => i + 1).map(h => (
                              <option key={h} value={h.toString()}>{h.toString().padStart(2, '0')} 點</option>
                            ))}
                          </select>
                          <select 
                            value={slotForm.minute} onChange={e => setSlotForm({...slotForm, minute: e.target.value})}
                            className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                          >
                            <option value="00">00 分</option>
                            <option value="30">30 分</option>
                          </select>
                        </div>
                      </div>

                      {/* Purposes (from Dict) */}
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-2">提供項目 (多選)</label>
                        {purposesDict.length === 0 ? (
                          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">請先至右上角管理常用辭庫新增項目</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {purposesDict.map(p => {
                              const selected = slotForm.purposes.includes(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => togglePurpose(p)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                                    selected ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-500"
                                  )}
                                >
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">人數上限 (預設無限制)</label>
                        <select 
                          value={slotForm.maxCapacity} 
                          onChange={e => setSlotForm({...slotForm, maxCapacity: parseInt(e.target.value)})}
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                        >
                          <option value={-1}>不限定</option>
                          <option value={1}>1 人</option>
                          <option value={2}>2 人</option>
                          <option value={3}>3 人</option>
                          <option value={4}>4 人</option>
                          <option value={5}>5 人</option>
                          <option value={10}>10 人</option>
                        </select>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        {editingSlotIndex >= 0 && (
                          <button onClick={resetSlotForm} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors">
                            取消
                          </button>
                        )}
                        <button 
                          onClick={handleSaveSlot}
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                          {editingSlotIndex >= 0 ? '儲存變更' : '加入時段'}
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex space-x-3 bg-slate-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
                取消
              </button>
              <button 
                onClick={handleSaveDay} 
                disabled={saving} 
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '完成並儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Manager Modal */}
      {showDictManager && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-slate-600" />
                常用辭庫管理
              </h2>
              <button onClick={() => setShowDictManager(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">建立您的服務項目（例如：剪髮、洗髮、會議），方便在設定時段時快速點選。</p>
              
              <div className="flex space-x-2 mb-6">
                <input 
                  type="text" 
                  value={newDictWord}
                  onChange={e => setNewDictWord(e.target.value)}
                  placeholder="輸入新項目"
                  className="flex-1 p-2.5 border border-slate-200 rounded-xl outline-none focus:border-green-500 bg-slate-50"
                  onKeyPress={e => e.key === 'Enter' && addDictWord()}
                />
                <button onClick={addDictWord} className="bg-green-500 hover:bg-green-600 text-white px-4 rounded-xl transition-colors shadow-sm">
                  新增
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {purposesDict.length === 0 && <p className="text-center text-slate-400 py-4">辭庫目前為空</p>}
                {purposesDict.map(word => (
                  <div key={word} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-medium text-slate-700">{word}</span>
                    <button onClick={() => removeDictWord(word)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowDictManager(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
