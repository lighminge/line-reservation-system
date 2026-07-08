import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { Calendar, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { saveUserProfile, addReservation } from './services/db';

function App() {
  const [liffState, setLiffState] = useState('init'); // init, ready, error
  const [profile, setProfile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) {
          throw new Error("請設定 VITE_LIFF_ID 環境變數");
        }
        
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile || !date || !time) return;

    setSubmitting(true);
    try {
      await addReservation(profile.userId, { date, time });
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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">預約成功！</h2>
          <p className="text-slate-500 text-center mb-8">
            我們已經收到您的預約資訊，<br />並且已透過 Line 發送確認訊息給您。
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
          <h2 className="text-xl font-bold text-slate-800 mb-6">請選擇預約時間</h2>
          
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

            {/* Time Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 flex items-center">
                <Clock className="w-4 h-4 mr-2" /> 預約時間
              </label>
              <select 
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none appearance-none"
              >
                <option value="" disabled>請選擇時間</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="13:00">01:00 PM</option>
                <option value="14:00">02:00 PM</option>
                <option value="15:00">03:00 PM</option>
                <option value="16:00">04:00 PM</option>
              </select>
            </div>

            {errorMsg && <p className="text-red-500 text-sm mt-2">{errorMsg}</p>}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center group shadow-lg shadow-slate-900/20"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>確認預約</span>
              )}
            </button>
          </form>
        </div>
        
      </div>
      
      <p className="mt-8 text-sm text-slate-400">Powered by Antigravity</p>
    </div>
  );
}

export default App;
