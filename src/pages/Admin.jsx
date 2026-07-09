import { useState, useEffect } from 'react';
import { Settings, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { getLineSettings, saveLineSettings } from '../services/db';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [liffId, setLiffId] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === adminPassword) {
      setIsAuthenticated(true);
      fetchSettings();
    } else {
      setMessage({ text: '密碼錯誤', type: 'error' });
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getLineSettings();
      if (settings) {
        setLiffId(settings.liffId || '');
        setChannelAccessToken(settings.channelAccessToken || '');
      }
    } catch (error) {
      setMessage({ text: '讀取設定失敗', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!liffId || !channelAccessToken) {
      setMessage({ text: '請填寫所有欄位', type: 'error' });
      return;
    }
    
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      await saveLineSettings(liffId, channelAccessToken);
      setMessage({ text: '儲存成功！系統已更新', type: 'success' });
    } catch (error) {
      setMessage({ text: `儲存失敗: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-slate-700" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">系統管理員登入</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">管理員密碼</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mt-1 rounded-xl border border-slate-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none"
                placeholder="請輸入 VITE_ADMIN_PASSWORD"
                required
              />
            </div>
            {message.type === 'error' && <p className="text-red-500 text-sm">{message.text}</p>}
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition-colors">
              登入
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mt-8">
        <div className="bg-slate-800 p-6 text-white flex items-center space-x-3">
          <Settings className="w-6 h-6" />
          <h1 className="text-xl font-bold">Line 系統參數設定</h1>
        </div>
        
        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">LIFF ID (前端登入用)</label>
                <input 
                  type="text" 
                  value={liffId}
                  onChange={(e) => setLiffId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none font-mono text-sm"
                  placeholder="例如：165xxxxxxx-xxxxxxx"
                  required
                />
                <p className="text-xs text-slate-400 mt-2">請從 LINE Developers Console 的 LINE Login Channel 中取得</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">Channel Access Token (後端推播用)</label>
                <textarea 
                  value={channelAccessToken}
                  onChange={(e) => setChannelAccessToken(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none font-mono text-sm h-32"
                  placeholder="請貼上長效 Token"
                  required
                />
                <p className="text-xs text-slate-400 mt-2">請從 LINE Developers Console 的 Messaging API Channel 中取得</p>
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.type === 'success' && <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {message.type === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-green-500/30"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '儲存設定'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
