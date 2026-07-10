import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, addMonths } from 'date-fns';
import { Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { getAvailability, getLineSettings, addReservation, saveUserProfile, getAdminReservations, getMessageTemplates } from '../services/db';

export default function ReservationForm() {
  const [liffError, setLiffError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [profile, setProfile] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [reservations, setReservations] = useState([]);
  const [templates, setTemplates] = useState(null);
  
  const [formData, setFormData] = useState({ date: '', time: '', purpose: '' });
  const [selectedSlot, setSelectedSlot] = useState(null); // the slot object
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    initLiffAndData();
  }, []);

  const initLiffAndData = async () => {
    try {
      const [settings, resData, tpls] = await Promise.all([
        getLineSettings(),
        getAdminReservations(),
        getMessageTemplates()
      ]);
      
      setReservations(resData);
      setTemplates(tpls);

      const activeConfig = (settings.configs || []).find(c => c.isActive) || settings.configs?.[0];
      
      if (!activeConfig || !activeConfig.liffId) {
        setLiffError("系統尚未設定 Line LIFF ID，請聯絡管理員設定。");
        setIsInitializing(false);
        return;
      }

      await liff.init({ liffId: activeConfig.liffId });
      
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const userProfile = await liff.getProfile();
      setProfile(userProfile);
      
      // Auto save user profile to db
      await saveUserProfile(userProfile.userId, userProfile.displayName);
      
      // Fetch availability for current month
      await fetchAvailability(currentMonth);

    } catch (err) {
      console.error(err);
      setLiffError(err.message || "初始化失敗");
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchAvailability = async (month) => {
    const monthStr = format(month, 'yyyy-MM');
    const data = await getAvailability(monthStr);
    setAvailability(data);
  };

  const handleMonthChange = async (month) => {
    setCurrentMonth(month);
    await fetchAvailability(month);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile?.userId) {
      alert("無法取得您的 Line 帳號資訊");
      return;
    }
    
    if (!formData.date || !formData.time || !formData.purpose) {
      alert("請完整選擇日期、時間與服務項目");
      return;
    }

    setIsSubmitting(true);
    try {
      await addReservation(profile.userId, formData);
      setSubmitSuccess(true);
    } catch (error) {
      alert("預約失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);
  const today = startOfDay(new Date());

  // Determine available slots for the selected date
  const availableSlots = formData.date && availability[formData.date] ? (availability[formData.date].slots || []) : [];
  
  // Calculate remaining capacity for a slot
  const getSlotCapacityInfo = (timeStr, maxCapacity) => {
    if (maxCapacity === -1) return { isFull: false, text: '可預約' };
    const currentCount = reservations.filter(r => r.date === formData.date && r.time === timeStr).length;
    const remaining = maxCapacity - currentCount;
    return {
      isFull: remaining <= 0,
      text: remaining <= 0 ? '已額滿' : `剩餘 ${remaining} 位`
    };
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        <span className="ml-3 text-slate-500 font-medium">系統初始化中...</span>
      </div>
    );
  }

  if (liffError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">發生錯誤</h2>
          <p className="text-slate-600">{liffError}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    const successTpl = templates?.clientSuccess || {
      title: "預約已送出！",
      text: "我們已經收到您的預約資訊。\n待管理員審核確認後，將會透過 Line 發送確認訊息給您。"
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center max-w-sm w-full animate-in zoom-in duration-300">
          {successTpl.imageUrl && (
            <img src={successTpl.imageUrl} alt="Success" className="w-full h-40 object-cover" />
          )}
          <div className="p-8">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{successTpl.title}</h2>
            <p className="text-slate-600 whitespace-pre-line leading-relaxed mb-8">
              {successTpl.text}
            </p>
            <button 
              onClick={() => liff.closeWindow()}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-slate-800/20"
            >
              關閉視窗
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Profile */}
        <div className="bg-slate-800 p-6 md:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-700 via-slate-800 to-slate-900 -z-10"></div>
          {profile?.pictureUrl ? (
            <img src={profile.pictureUrl} alt="Profile" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white/20 shadow-xl" />
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/20">
              <span className="text-2xl text-white">👤</span>
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">您好，{profile?.displayName}</h1>
          <p className="text-slate-300 text-sm font-medium">歡迎使用線上預約服務</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Calendar Section */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">1. 選擇預約日期</h2>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <button type="button" onClick={() => handleMonthChange(addMonths(currentMonth, -1))} className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-white rounded-lg shadow-sm">
                  &lt;
                </button>
                <span className="font-bold text-slate-800 text-lg">{format(currentMonth, 'yyyy 年 MM 月')}</span>
                <button type="button" onClick={() => handleMonthChange(addMonths(currentMonth, 1))} className="text-slate-500 hover:text-slate-800 font-bold px-3 py-1 bg-white rounded-lg shadow-sm">
                  &gt;
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-sm font-bold text-slate-400 mb-4">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => <div key={day}>{day}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {paddingDays.map(i => <div key={`padding-${i}`} />)}
                
                {days.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isPast = isBefore(date, today);
                  const isAvailable = availability[dateStr]?.isOpen;
                  const isSelected = formData.date === dateStr;
                  const isDisabled = isPast || !isAvailable;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setFormData({ date: dateStr, time: '', purpose: '' });
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-full text-sm font-bold transition-all relative",
                        isSelected && "bg-green-500 text-white shadow-md shadow-green-500/30 ring-2 ring-green-500 ring-offset-2",
                        !isSelected && !isDisabled && "bg-white text-slate-700 hover:bg-green-50 hover:text-green-600 shadow-sm",
                        isDisabled && "text-slate-300 cursor-not-allowed"
                      )}
                    >
                      {format(date, 'd')}
                      {isAvailable && !isPast && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 bg-green-400 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Time & Purpose Section */}
          {formData.date && (
            <section className="animate-in slide-in-from-top-4 duration-300 fade-in">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">2. 選擇時段與項目</h2>
              </div>
              
              {availableSlots.length > 0 ? (
                <div className="space-y-6">
                  {/* Slots Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {availableSlots.map(slot => {
                      const { isFull, text } = getSlotCapacityInfo(slot.time, slot.maxCapacity);
                      const isSelected = formData.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isFull}
                          onClick={() => {
                            setFormData({ ...formData, time: slot.time, purpose: '' });
                            setSelectedSlot(slot);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all",
                            isSelected ? "border-green-500 bg-green-50 shadow-sm" : isFull ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed" : "border-slate-200 bg-white hover:border-green-300"
                          )}
                        >
                          <span className={cn("text-xl font-bold mb-1", isSelected ? "text-green-600" : isFull ? "text-slate-400" : "text-slate-700")}>
                            {slot.time}
                          </span>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", isSelected ? "bg-green-100 text-green-700" : isFull ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500")}>
                            {text}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Purposes Selection for the selected slot */}
                  {selectedSlot && (
                    <div className="animate-in zoom-in-95 duration-200">
                      <label className="text-sm font-bold text-slate-700 block mb-3 pl-1">請選擇服務項目</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedSlot.purposes.map(purpose => (
                          <button
                            key={purpose}
                            type="button"
                            onClick={() => setFormData({ ...formData, purpose })}
                            className={cn(
                              "py-3 px-2 rounded-xl text-sm font-bold transition-all border-2",
                              formData.purpose === purpose ? "bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-800/20" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                            )}
                          >
                            {purpose}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-600 p-6 rounded-2xl text-center border border-amber-100">
                  <span className="text-2xl mb-2 block">😌</span>
                  <p className="font-medium">很抱歉，此日期目前沒有開放時段</p>
                </div>
              )}
            </section>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.date || !formData.time || !formData.purpose}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center text-lg shadow-xl shadow-green-500/20 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  送出預約中...
                </>
              ) : (
                "立即預約"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
