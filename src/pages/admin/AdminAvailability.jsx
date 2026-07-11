import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, X, Plus, Clock, Users, BookOpen, Trash2, AlertCircle } from 'lucide-react';
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

  // Custom Alert/Confirm Modals
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

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
        slots: existing.slots || (existing.timeSlots || []).map(t => ({
          time: t,
          purposes: existing.purposes || [],
          maxCapacity: -1
        }))
      });
    } else {
      setDaySettings({ slots: [] });
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
      const dataToSave = { 
        month: monthStr, 
        date: selectedDate, 
        isOpen: daySettings.slots.length > 0, 
        slots: daySettings.slots 
      };
      await saveAvailability(existingId, dataToSave);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      setAlertModal({ isOpen: true, message: "儲存失敗: " + error.message });
    } finally {
      setSaving(false);
    }
  };

  const addOrUpdateSlot = () => {
    if (!slotForm.hour || !slotForm.minute || slotForm.purposes.length === 0) {
      setAlertModal({ isOpen: true, message: "請完整填寫時間與預約目的" });
      return;
    }
    
    // Check if purposes in dict, if not add them
    slotForm.purposes.forEach(async p => {
      if (!purposesDict.includes(p)) {
        const newDict = [...purposesDict, p];
        await saveDictionary('purposes', newDict);
        setPurposesDict(newDict);
      }
    });

    let h = parseInt(slotForm.hour);
    if (slotForm.ampm === 'PM' && h < 12) h += 12;
    if (slotForm.ampm === 'AM' && h === 12) h = 0;
    
    const timeStr = `${h.toString().padStart(2, '0')}:${slotForm.minute}`;
    
    const newSlot = {
      time: timeStr,
      purposes: slotForm.purposes,
      maxCapacity: slotForm.maxCapacity
    };

    const newSlots = [...daySettings.slots];
    
    if (editingSlotIndex >= 0) {
      newSlots[editingSlotIndex] = newSlot;
    } else {
      if (newSlots.some(s => s.time === timeStr)) {
        setAlertModal({ isOpen: true, message: "該時間時段已經存在！" });
        return;
      }
      newSlots.push(newSlot);
    }

    newSlots.sort((a, b) => a.time.localeCompare(b.time));
    setDaySettings({ ...daySettings, slots: newSlots });
    resetSlotForm();
  };

  const editSlot = (index) => {
    const slot = daySettings.slots[index];
    const [hStr, mStr] = slot.time.split(':');
    let h = parseInt(hStr);
    let ampm = 'AM';
    if (h >= 12) {
      ampm = 'PM';
      if (h > 12) h -= 12;
    } else if (h === 0) {
      h = 12;
    }
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
      setAlertModal({ isOpen: true, message: "該時段已有客戶預約，無法刪除！" });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      message: `確定要刪除 ${slot.time} 時段嗎？`,
      onConfirm: () => {
        const newSlots = [...daySettings.slots];
        newSlots.splice(index, 1);
        setDaySettings({ ...daySettings, slots: newSlots });
        if (editingSlotIndex === index) resetSlotForm();
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
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
    setConfirmModal({
      isOpen: true,
      message: `確定要從辭庫刪除「${word}」嗎？`,
      onConfirm: async () => {
        const newDict = purposesDict.filter(w => w !== word);
        await saveDictionary('purposes', newDict);
        setPurposesDict(newDict);
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
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
                      {settings.slots?.map((s, idx) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                        const colorClass = colors[idx % colors.length];
                        return (
                          <div key={s.time} className={`text-[10px] md:text-xs text-white px-1.5 py-1 rounded shadow-sm text-center font-medium truncate ${colorClass}`}>
                            {s.time}
                          </div>
                        );
                      })}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                設定預約：{selectedDate}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Form */}
              <div className="flex-1 space-y-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-green-500" />
                    {editingSlotIndex >= 0 ? '編輯時段' : '新增時段'}
                  </h3>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <select value={slotForm.ampm} onChange={e => setSlotForm({...slotForm, ampm: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white">
                      <option value="AM">上午</option>
                      <option value="PM">下午</option>
                    </select>
                    <select value={slotForm.hour} onChange={e => setSlotForm({...slotForm, hour: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white min-w-[60px]">
                      {Array.from({length: 12}, (_, i) => i === 0 ? 12 : i).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span>:</span>
                    <select value={slotForm.minute} onChange={e => setSlotForm({...slotForm, minute: e.target.value})} className="p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white min-w-[60px]">
                      <option value="00">00</option>
                      <option value="30">30</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-bold text-slate-700 block mb-2">提供預約項目 (可複選)</label>
                    <div className="flex flex-wrap gap-2">
                      {purposesDict.map(p => (
                        <button 
                          key={p} type="button"
                          onClick={() => togglePurpose(p)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                            slotForm.purposes.includes(p) ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200 hover:border-green-300"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                      {purposesDict.length === 0 && <span className="text-xs text-slate-400">請先建立常用辭庫</span>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-bold text-slate-700 block mb-2">可預約人數上限</label>
                    <select 
                      value={slotForm.maxCapacity} 
                      onChange={e => setSlotForm({...slotForm, maxCapacity: parseInt(e.target.value)})}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-green-500 bg-white"
                    >
                      <option value={-1}>不限定 (無上限)</option>
                      {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} 人</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={addOrUpdateSlot}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-xl transition-colors font-medium text-sm flex items-center justify-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {editingSlotIndex >= 0 ? '更新此時段' : '加入時段'}
                    </button>
                    {editingSlotIndex >= 0 && (
                      <button 
                        onClick={resetSlotForm}
                        className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl transition-colors font-medium text-sm"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Existing Slots */}
              <div className="flex-1">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center">
                  <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-500" />
                  已建立的時段
                </h3>
                <div className="space-y-3">
                  {daySettings.slots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      <p className="text-sm">尚無時段，請在左側新增</p>
                    </div>
                  ) : (
                    daySettings.slots.map((s, idx) => {
                      // Calculate slot reservations
                      const slotRes = reservations.filter(r => r.date === selectedDate && r.time === s.time);
                      const confirmedCount = slotRes.filter(r => r.status === 'confirmed').length;
                      const totalCount = slotRes.length;

                      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500'];
                      const colorClass = colors[idx % colors.length];
                      
                      return (
                        <div 
                          key={s.time}
                          onClick={() => editSlot(idx)}
                          className={`relative flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 text-white cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm ${colorClass}`}
                        >
                          <div>
                            <div className="font-bold text-lg flex items-center">
                              {s.time}
                              {s.maxCapacity > 0 && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">上限 {s.maxCapacity}人</span>}
                            </div>
                            <div className="text-xs text-white/80 mt-1 truncate max-w-[150px]">
                              {s.purposes.join(', ')}
                            </div>
                            {/* Reservation counts display */}
                            <div className="text-[10px] mt-1 bg-white/20 inline-block px-1.5 py-0.5 rounded">
                              已預約: {totalCount} 人 (已確認: {confirmedCount} 人)
                            </div>
                          </div>
                          <button 
                            onClick={(e) => deleteSlot(idx, e)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors absolute right-3 top-3"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex space-x-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors">
                取消
              </button>
              <button onClick={handleSaveDay} disabled={saving} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-colors flex justify-center items-center">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存當日設定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Manager Modal */}
      {showDictManager && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-slate-500" />
                常用辭庫管理
              </h2>
              <button onClick={() => setShowDictManager(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex space-x-2 mb-6">
                <input 
                  type="text" 
                  value={newDictWord}
                  onChange={e => setNewDictWord(e.target.value)}
                  placeholder="輸入新的服務項目..."
                  className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-colors"
                />
                <button onClick={addDictWord} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl transition-colors font-medium whitespace-nowrap">
                  新增
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {purposesDict.map(word => (
                  <div key={word} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl hover:border-slate-200 transition-colors">
                    <span className="font-medium text-slate-700">{word}</span>
                    <button onClick={() => removeDictWord(word)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {purposesDict.length === 0 && <div className="text-center text-slate-400 py-4">目前沒有任何辭庫資料</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">提示</h3>
            <p className="text-slate-500 mb-6 font-medium">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-colors">
              確定
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">確認執行</h3>
            <p className="text-slate-500 mb-6 font-medium">{confirmModal.message}</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })} className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-colors">
                取消
              </button>
              <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors">
                確定執行
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Icon component
function CheckCircleIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
