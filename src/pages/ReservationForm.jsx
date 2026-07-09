import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle2, Loader2, AlertCircle, FileText } from 'lucide-react';
import { saveUserProfile, addReservation, getLineSettings, getAvailability } from '../services/db';

export default function ReservationForm() {
  const [liffState, setLiffState] = useState('init'); // init, ready, error
  const [profile, setProfile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Availability State
  const [availabilityDict, setAvailabilityDict] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availablePurposes, setAvailablePurposes] = useState([]);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const lineSettings = await getLineSettings();
        if (!lineSettings || !lineSettings.liffId) {
          throw new Error("系統尚未設定 Line LIFF ID，請聯絡管理員設定。");
        }
        
        const liffId = lineSettings.liffId;
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
          // Save to Firebase
          await saveUserProfile(userProfile.userId, userProfile.displayName);
          setLiffState('ready');
        } else {
          // If not in LINE app, prompt login
          liff.login();
        }
      } catch (err) {
        console.error('LIFF Init Error:', err);
        setErrorMsg(err.message || 'LIFF 初始化失敗');
        setLiffState('error');
      }
    };

    initLiff();
  }, []);

  // Fetch availability when month changes (simplified by fetching based on selected date's month)
  useEffect(() => {
    if (liffState === 'ready' && date) {
      const monthStr = date.substring(0, 7); // e.g. "2026-07"
      const fetchAvailability = async () => {
        setLoadingAvailability(true);
        const data = await getAvailability(monthStr);
        setAvailabilityDict(data);
        setLoadingAvailability(false);
      };
      fetchAvailability();
    }
  }, [date, liffState]);

  // Update available times and purposes when date or dict changes
  useEffect(() => {
    if (date && availabilityDict[date]?.isOpen) {
      setAvailableTimes(availabilityDict[date].timeSlots || []);
      setAvailablePurposes(availabilityDict[date].purposes || []);
    } else {
      setAvailableTimes([]);
      setAvailablePurposes([]);
    }
    // Reset selections
    setTime('');
    setPurpose('');
  }, [date, availabilityDict]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile || !date || !time) return;

    setSubmitting(true);
    try {
      await addReservation(profile.userId, { date, time, purpose });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('預約送出失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (liffState === 'init') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
        <p className="text-lg font-medium">系統載入中...</p>
      </div>
    );
  }

  if (liffState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6">
        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">發生錯誤</h2>
          <p className="text-red-600 text-center">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 flex flex-col items-center max-w-sm w-full">
          <div className="bg-green-100 p-3 rounded-full mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">預約已送出！</h2>
          <p className="text-slate-500 text-center mb-8">
            我們已經收到您的預約資訊。<br />待管理員審核確認後，將會透過 Line 發送確認訊息給您。
          </p>
          <button 
            onClick={() => liff.closeWindow()}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    );
  }

  const isDateOpen = availabilityDict[date]?.isOpen;

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mt-8">
        
        {/* Header Profile Section */}
        <div className="bg-gradient-to-br from-green-400 to-green-600 p-8 text-white flex items-center space-x-4">
          {profile?.pictureUrl ? (
            <img src={profile.pictureUrl} alt="Profile" className="w-16 h-16 rounded-full border-4 border-white/30 shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          )}
          <div>
            <p className="text-green-50 text-sm font-medium">歡迎回來</p>
            <h1 className="text-2xl font-bold">{profile?.displayName || '用戶'}</h1>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">請填寫預約資訊</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> 預約日期
              </label>
              <input 
                type="date" 
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
              />
            </div>

            {loadingAvailability ? (
              <div className="py-8 flex flex-col items-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-sm">檢查可預約時段...</span>
              </div>
            ) : !isDateOpen ? (
              <div className="py-6 px-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">此日期尚未開放預約</p>
                <p className="text-xs text-slate-400 mt-1">請選擇其他日期</p>
              </div>
            ) : (
              <>
                {/* Time Input */}
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-semibold text-slate-600 flex items-center">
                    <Clock className="w-4 h-4 mr-2" /> 預約時段
                  </label>
                  {availableTimes.length === 0 ? (
                    <p className="text-sm text-red-500 p-3 bg-red-50 rounded-xl">本日無可用時段</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className={cn(
                            "p-2 rounded-lg text-sm font-medium transition-all border",
                            time === t 
                              ? "bg-green-500 text-white border-green-500 shadow-md shadow-green-500/30" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-green-500 hover:text-green-600"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purpose Input */}
                {availablePurposes.length > 0 && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-semibold text-slate-600 flex items-center">
                      <FileText className="w-4 h-4 mr-2" /> 預約項目
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availablePurposes.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPurpose(p)}
                          className={cn(
                            "p-2 rounded-lg text-sm font-medium transition-all border",
                            purpose === p 
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-600"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {errorMsg && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg">{errorMsg}</p>}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={submitting || !isDateOpen || !time}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center group shadow-lg shadow-slate-900/20"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>確認送出預約</span>
              )}
            </button>
          </form>
        </div>
        
      </div>
      
      <p className="mt-8 text-sm text-slate-400">Powered by Antigravity</p>
    </div>
  );
}
