import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getLineSettings, saveLineSettings } from '../../services/db';

export default function AdminSettings() {
  const [liffId, setLiffId] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getLineSettings();
      if (settings) {
        setLiffId(settings.liffId || '');
        setChannelAccessToken(settings.channelAccessToken || '');
      }
    } catch (error) {
      // It's expected to throw if not set yet, so we just set message to empty or warning
      console.warn(error);
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">系統設定</h1>
        <p className="text-slate-500 mt-2">管理 Line API 金鑰與系統層級的環境變數</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-6 text-white flex items-center space-x-3">
          <Settings className="w-6 h-6" />
          <h2 className="text-xl font-bold">Line 系統參數</h2>
        </div>
        
        <div className="p-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">LIFF ID (前端登入用)</label>
                <input 
                  type="text" 
                  value={liffId}
                  onChange={(e) => setLiffId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                  placeholder="例如：165xxxxxxx-xxxxxxx"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">請從 LINE Developers Console 的 LINE Login Channel 中取得</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Channel Access Token (後端推播用)</label>
                <textarea 
                  value={channelAccessToken}
                  onChange={(e) => setChannelAccessToken(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none font-mono text-sm h-32 bg-slate-50 focus:bg-white transition-colors"
                  placeholder="請貼上長效 Token"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">請從 LINE Developers Console 的 Messaging API Channel 中取得</p>
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
