import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, addMonths, parseISO } from 'date-fns';
import { Calendar, Clock, Loader2, CheckCircle2, Tag, Trash2, List, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { getAvailability, getLineSettings, addReservation, saveUserProfile, updateUserProfile, getAdminReservations, getMessageTemplates, updateReservationStatus, getDictionary } from '../services/db';

export default function ReservationForm() {
  const [liffError, setLiffError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [profile, setProfile] = useState(null);
  const [childName, setChildName] = useState('');
  const [dbProfile, setDbProfile] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [reservations, setReservations] = useState([]);
  const [purposesDict, setPurposesDict] = useState([]);
  const [templates, setTemplates] = useState(null);
  
  // Step 1: purpose, Step 2: date, Step 3: time
  const [formData, setFormData] = useState({ purpose: '', date: '', time: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // My Reservations enhancements
  const [myResFilter, setMyResFilter] = useState('ALL');
  const [cancelModal, setCancelModal] = useState({ isOpen: false, resId: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    initLiffAndData();
  }, []);

  const initLiffAndData = async () => {
    try {
      const [settings, resData, tpls, pDict] = await Promise.all([
        getLineSettings(),
        getAdminReservations(),
        getMessageTemplates(),
        getDictionary('purposes')
      ]);
      
      setReservations(resData);
      setTemplates(tpls);
      
      const today = startOfDay(new Date());
      const activePurposes = pDict.filter(p => {
        if (!p.endDate) return true;
        return !isBefore(parseISO(p.endDate), today);
      });
      setPurposesDict(activePurposes);

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
      setProfile(userProfile); // keep LINE profile for display name
      
      const savedDbProfile = await saveUserProfile(
        userProfile.userId, 
        userProfile.displayName, 
        activeConfig.name || "預設 Line 官方", 
        userProfile.pictureUrl
      );
      
      setDbProfile(savedDbProfile);
      if (savedDbProfile?.childName) {
        setChildName(savedDbProfile.childName);
      }
      
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
      alert("請完整選擇預約項目、日期與時間");
      return;
    }

    setIsSubmitting(true);
    try {
      if (dbProfile && childName !== dbProfile.childName) {
        await updateUserProfile(profile.userId, { childName });
      }
      await addReservation(profile.userId, formData);
      setSubmitSuccess(true);
      const resData = await getAdminReservations();
      setReservations(resData);
      
      // Trigger LINE push message for successful submission
      await fetch('/api/send-line-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          reservationId: 'NEW',
          date: formData.date,
          time: formData.time,
          purpose: formData.purpose,
          type: 'submit'
        }),
      }).catch(e => console.warn("Push API maybe not available:", e));
    } catch (err) {
      alert("預約失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add useEffect to handle auto switch when purpose changes
  useEffect(() => {
    if (formData.purpose) {
      const autoSwitch = async () => {
        try {
          const { getAllAvailability } = await import('../services/db');
          const allData = await getAllAvailability();
          const dates = Object.keys(allData).sort();
          for (let d of dates) {
            const slots = allData[d].slots || [];
            if (slots.some(s => s.purposes.includes(formData.purpose))) {
              const newMonth = parseISO(d);
              if (format(newMonth, 'yyyy-MM') !== format(currentMonth, 'yyyy-MM')) {
                handleMonthChange(newMonth);
              }
              break;
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      autoSwitch();
    }
  }, [formData.purpose]);

  const confirmCancel = async () => {
    if (!cancelModal.resId) return;
    setIsCancelling(true);
    try {
      await updateReservationStatus(cancelModal.resId, 'cancelled');
      const resData = await getAdminReservations();
      setReservations(resData);
      setCancelModal({ isOpen: false, resId: null });
    } catch (err) {
      alert("取消失敗：" + err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const closeLiff = () => {
    try {
      if (liff.isInClient()) {
        liff.closeWindow();
      } else {
        setSubmitSuccess(false);
        setFormData({ purpose: '', date: '', time: '' });
      }
    } catch (e) {
      setSubmitSuccess(false);
      setFormData({ purpose: '', date: '', time: '' });
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
        <p className="text-slate-500 font-medium">系統初始化中...</p>
      </div>
    );
  }

  if (liffError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-sm w-full">
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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden text-center max-w-sm w-full animate-in zoom-in duration-300 p-8">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">已收到您的預約</h2>
          
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left space-y-3 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
              <span className="text-slate-400 font-medium text-sm">預約日期</span>
              <span className="font-bold text-slate-700">{formData.date}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
              <span className="text-slate-400 font-medium text-sm">預約時間</span>
              <span className="font-bold text-slate-700">{formData.time}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400 font-medium text-sm">預約項目</span>
              <span className="font-bold text-slate-700">{formData.purpose || '一般預約'}</span>
            </div>
          </div>

          <button 
            onClick={closeLiff}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-slate-800/20"
          >
            完成並關閉
          </button>
        </div>
      </div>
    );
  }

  const today = startOfDay(new Date());
  
  // ALL My reservations
  const allUserReservations = reservations.filter(r => r.userId === profile?.userId && r.status !== 'cancelled');
  
  // FILTERED and SORTED My reservations
  const filteredUserReservations = allUserReservations
    .filter(r => myResFilter === 'ALL' || r.purpose === myResFilter)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  
  // Today's reservations for the time slot selection prevention
  const userReservationsToday = allUserReservations.filter(r => r.date === formData.date);

  const getIsDateAvailable = (dateStr) => {
    const settings = availability[dateStr];
    if (!settings?.isOpen || !settings.slots) return false;
    if (!formData.purpose) return true;
    return settings.slots.some(s => s.purposes.includes(formData.purpose));
  };

  const getAvailableSlots = () => {
    if (!formData.date || !formData.purpose) return [];
    const settings = availability[formData.date];
    if (!settings?.slots) return [];
    return settings.slots.filter(s => s.purposes.includes(formData.purpose));
  };

  const availableSlots = getAvailableSlots();

  const getSlotCapacityInfo = (timeStr, maxCap) => {
    let isFull = false;
    let text = '可預約';
    let remain = Infinity;

    const selectedPurposeObj = purposesDict.find(p => p.name === formData.purpose);
    const purposeLimit = selectedPurposeObj?.slotApprovedLimit || -1;

    // 1. Check purpose level limit (only CONFIRMED reservations count towards this limit)
    if (purposeLimit !== -1) {
      const purposeConfirmedCount = reservations.filter(r => r.date === formData.date && r.time === timeStr && r.purpose === formData.purpose && r.status === 'confirmed').length;
      if (purposeConfirmedCount >= purposeLimit) {
        return { isFull: true, text: '已額滿' };
      }
      remain = Math.min(remain, purposeLimit - purposeConfirmedCount);
    }

    // 2. Check slot level limit (ALL non-cancelled reservations count towards slot limit)
    if (maxCap !== -1) {
      const resCount = reservations.filter(r => r.date === formData.date && r.time === timeStr && r.status !== 'cancelled').length;
      if (resCount >= maxCap) {
        return { isFull: true, text: '已額滿' };
      }
      remain = Math.min(remain, maxCap - resCount);
    }

    // Do not show remaining spots count based on user request

    return { isFull: false, text };
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay }, (_, i) => i);

  // Get unique purposes from all user reservations for the dropdown
  const uniqueUserPurposes = [...new Set(allUserReservations.map(r => r.purpose))];
  const userConfirmedPurposes = [...new Set(allUserReservations.filter(r => r.status === 'confirmed').map(r => r.purpose))];

  const handleSelectPurpose = (p) => {
    if (p.userLimit && p.userLimit !== -1) {
      const currentCount = allUserReservations.filter(r => r.purpose === p.name).length;
      if (currentCount >= p.userLimit) {
        setAlertModal({ 
          isOpen: true, 
          message: `您在此項目「${p.name}」的預約次數已達上限 (${p.userLimit}次)！\n請先完成或取消現有預約。` 
        });
        return;
      }
    }
    setFormData({ purpose: p.name, date: '', time: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
      <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
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

          {/* User's existing active reservations globally */}
          {allUserReservations.length > 0 && !formData.purpose && (
            <div className="bg-blue-50 border border-blue-100 p-4 md:p-5 rounded-2xl animate-in fade-in duration-300 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                <div className="text-sm font-bold text-blue-800 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" /> 您的近期預約 <span className="ml-1 opacity-70">({allUserReservations.length}筆)</span>
                </div>
                
                {uniqueUserPurposes.length > 0 && (
                  <select 
                    value={myResFilter}
                    onChange={e => setMyResFilter(e.target.value)}
                    className="p-1.5 text-xs bg-white border border-blue-200 rounded-lg outline-none text-blue-800 font-medium"
                  >
                    <option value="ALL">全部項目</option>
                    {uniqueUserPurposes.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="space-y-2">
                {filteredUserReservations.length === 0 ? (
                  <div className="text-center text-xs text-blue-600/70 py-2">該項目沒有預約紀錄</div>
                ) : (
                  filteredUserReservations.map((r, i) => (
                    <div key={r.id} className="bg-white px-3 py-2.5 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between text-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{r.date} {r.time}</span>
                          <span className="text-slate-500 text-xs font-medium">{r.purpose}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", r.status === 'confirmed' ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200")}>
                          {r.status === 'confirmed' ? '已確認' : '待審核'}
                        </span>
                        {r.status === 'pending' ? (
                          <button 
                            type="button"
                            disabled={isCancelling}
                            onClick={() => setCancelModal({ isOpen: true, resId: r.id })}
                            className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            type="button"
                            disabled
                            className="p-2 bg-slate-50 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed"
                            title="預約已核准，無法刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Child Name Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <h2 className="text-lg font-bold text-slate-800">孩子姓名 <span className="text-red-500">*</span></h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <input 
                type="text"
                value={childName}
                onChange={e => setChildName(e.target.value)}
                placeholder="請輸入孩子姓名"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-colors"
                required
              />
              {!childName && (
                <div className="mt-2 text-red-500 text-sm font-medium flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" /> 請先填寫孩子姓名，再選擇預約項目
                </div>
              )}
            </div>
          </section>

          {!formData.purpose ? (
            <section className={cn("animate-in fade-in slide-in-from-bottom-4 duration-300", !childName && "opacity-50 pointer-events-none")}>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <List className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">1. 選擇預約項目</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {purposesDict.map(p => {
                  const isRestricted = p.restrictedUsers?.includes(profile?.userId);
                  const isNotStarted = p.startDate && format(today, 'yyyy-MM-dd') < p.startDate;
                  const hasConfirmed = userConfirmedPurposes.includes(p.name);
                  const isDisabled = isRestricted || isNotStarted || hasConfirmed;
                  
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectPurpose(p)}
                      className={cn(
                        "py-4 px-3 rounded-2xl text-base font-bold transition-all border-2 flex flex-col justify-center items-center gap-1",
                        isDisabled ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" : "bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50"
                      )}
                    >
                      <span>{p.name}</span>
                      {isRestricted ? (
                        <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium mt-1">您無權預約此項目</span>
                      ) : isNotStarted ? (
                        <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium mt-1">預約未開始 (開始日: {p.startDate.slice(5)})</span>
                      ) : hasConfirmed ? (
                        <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium mt-1">已獲核准，無法重複預約</span>
                      ) : null}
                    </button>
                  );
                })}
                {purposesDict.length === 0 && (
                  <div className="col-span-2 text-center text-slate-400 py-4 bg-slate-50 rounded-xl">
                    目前沒有開放預約的項目
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-100 animate-in fade-in duration-300 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <List className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-600 mb-0.5">已選擇項目</div>
                  <div className="text-base font-bold text-slate-800">{formData.purpose}</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({ purpose: '', date: '', time: '' })}
                className="px-4 py-2 bg-white hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-lg transition-colors border border-purple-200 shadow-sm shrink-0"
              >
                重新選擇
              </button>
            </div>
          )}

          {formData.purpose && (
            <section className="animate-in slide-in-from-top-4 duration-300 fade-in">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">2. 選擇預約日期</h2>
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
                    const isAvailable = getIsDateAvailable(dateStr);
                    const isSelected = formData.date === dateStr;
                    const isDisabled = isPast || !isAvailable;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setFormData({ ...formData, date: dateStr, time: '' });
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
          )}

          {formData.date && (
            <section className="animate-in slide-in-from-top-4 duration-300 fade-in">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">3. 選擇時段</h2>
              </div>
              
              {availableSlots.length > 0 ? (
                <div className="space-y-6">
                  
                  {userReservationsToday.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-4">
                      <div className="text-sm font-bold text-blue-800 mb-2">💡 您本日已預約：</div>
                      <div className="flex flex-col gap-2">
                        {userReservationsToday.map(r => (
                          <div key={r.id} className="text-sm bg-white text-blue-800 px-3 py-2 rounded-xl shadow-sm font-medium border border-blue-100 flex items-center justify-between">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {r.time} ({r.purpose})</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold bg-blue-100 px-2 py-0.5 rounded-full text-blue-600 border border-blue-200">{r.status === 'confirmed' ? '已確認' : '待審核'}</span>
                              {r.status === 'pending' ? (
                                <button 
                                  type="button"
                                  disabled={isCancelling}
                                  onClick={() => setCancelModal({ isOpen: true, resId: r.id })}
                                  className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1.5 bg-slate-50 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed"
                                  title="預約已核准，無法刪除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {availableSlots.map(slot => {
                      const { isFull, text } = getSlotCapacityInfo(slot.time, slot.maxCapacity);
                      const isSelected = formData.time === slot.time;
                      const hasBooked = userReservationsToday.some(r => r.time === slot.time);
                      const isDisabled = isFull || hasBooked;

                      let statusText = text;
                      let statusClass = "bg-slate-100 text-slate-500";
                      
                      if (hasBooked) {
                        statusText = "已預約";
                        statusClass = "bg-blue-100 text-blue-600";
                      } else if (isFull) {
                        statusClass = "bg-red-50 text-red-500";
                      } else if (isSelected) {
                        statusClass = "bg-blue-100 text-blue-700";
                      }

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setFormData({ ...formData, time: slot.time });
                            setSelectedSlot(slot);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                            isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : isDisabled ? "border-slate-100 bg-slate-50 opacity-70 cursor-not-allowed" : "border-slate-200 bg-white hover:border-blue-300"
                          )}
                        >
                          <span className={cn("text-xl font-bold mb-1", isSelected ? "text-blue-600" : isDisabled ? "text-slate-400" : "text-slate-700")}>
                            {slot.time}
                          </span>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", statusClass)}>
                            {statusText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-600 p-6 rounded-2xl text-center border border-amber-100">
                  <span className="text-2xl mb-2 block">😌</span>
                  <p className="font-medium">此日期沒有開放「{formData.purpose}」的時段</p>
                </div>
              )}
            </section>
          )}

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

      {/* Cancel Confirm Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">取消預約</h3>
            <p className="text-slate-500 mb-6 font-medium text-sm">確定要取消這筆預約嗎？<br/>取消後若需重新預約，將以系統最新剩餘名額為準。</p>
            <div className="flex space-x-3">
              <button 
                disabled={isCancelling}
                onClick={() => setCancelModal({ isOpen: false, resId: null })} 
                className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                返回保留
              </button>
              <button 
                onClick={confirmCancel} 
                disabled={isCancelling}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : '確定取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">提示</h3>
            <p className="text-slate-500 mb-6 font-medium text-sm whitespace-pre-line leading-relaxed">{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal({ isOpen: false, message: '' })}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-colors flex justify-center items-center"
            >
              確定
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
