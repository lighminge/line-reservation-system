import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, Loader2, AlertCircle, Plus, Trash2, KeyRound, X, AlertTriangle } from 'lucide-react';
import { getLineSettings, saveLineSettings, getAdminPassword, saveAdminPassword } from '../../services/db';

export default function AdminSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Password state
  const [password, setPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });

  // Modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getLineSettings();
      setConfigs(settings.configs || []);
      
      const pwd = await getAdminPassword();
      setPassword(pwd);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = () => {
    setConfigs([
      ...configs, 
      { id: Date.now().toString(), name: '新 Line 設定', liffId: '', channelAccessToken: '', isActive: configs.length === 0 }
    ]);
  };

  const handleRemoveConfig = (id) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete_config',
      id: id,
      title: '刪除設定',
      message: '確定要刪除這組 Line 設定檔嗎？刪除後如果您儲存設定，將無法復原。'
    });
  };

  const executeAction = () => {
    if (confirmModal.type === 'delete_config') {
      const newConfigs = configs.filter(c => c.id !== confirmModal.id);
      // If we removed the active one, make the first one active
      if (newConfigs.length > 0 && !newConfigs.some(c => c.isActive)) {
        newConfigs[0].isActive = true;
      }
      setConfigs(newConfigs);
    }
    setConfirmModal({ isOpen: false, type: '', id: null, title: '', message: '' });
  };

  const handleConfigChange = (id, field, value) => {
    const newConfigs = configs.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      // If setting isActive, turn off others
      if (field === 'isActive' && value === true) {
        return { ...c, isActive: false };
      }
      return c;
    });
    setConfigs(newConfigs);
  };

  const handleSaveLineSettings = async (e) => {
    e.preventDefault();
    
    // Validation
    const invalid = configs.some(c => !c.name || !c.liffId || !c.channelAccessToken);
    if (invalid) {
      setMessage({ text: '請填寫所有設定檔的必填欄位', type: 'error' });
      return;
    }
    
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
      await saveLineSettings({ configs });
      setMessage({ text: 'Line 設定儲存成功！', type: 'success' });
    } catch (error) {
      setMessage({ text: `儲存失敗: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!password) {
      setPwdMessage({ text: '密碼不能為空', type: 'error' });
      return;
    }

    setPasswordSaving(true);
    setPwdMessage({ text: '', type: '' });
    try {
      await saveAdminPassword(password);
      setPwdMessage({ text: '密碼更新成功！下次登入請使用新密碼', type: 'success' });
    } catch (error) {
      setPwdMessage({ text: `密碼更新失敗: ${error.message}`, type: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">系統設定</h1>
        <p className="text-slate-500 mt-2">管理 Line API 金鑰與後台登入密碼</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : (
        <>
          {/* Password Settings */}
          <div className="bg-white comic-box overflow-hidden">
            <div className="bg-slate-800 p-5 text-white flex items-center space-x-3">
              <KeyRound className="w-5 h-5" />
              <h2 className="text-lg font-bold">後台管理員密碼</h2>
            </div>
            
            <div className="p-6 md:p-8">
              <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">修改登入密碼</label>
                  <input 
                    type="text" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors bg-slate-50 focus:bg-white"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">修改後，下次登入即生效。請務必牢記新密碼。</p>
                </div>

                {pwdMessage.text && (
                  <div className={`p-3 rounded-xl flex items-center text-sm ${pwdMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {pwdMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 shrink-0" />}
                    <span>{pwdMessage.text}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={passwordSaving}
                  className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center shadow-sm"
                >
                  {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  儲存密碼
                </button>
              </form>
            </div>
          </div>

          {/* Line Settings */}
          <div className="bg-white comic-box overflow-hidden">
            <div className="bg-green-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-bold">Line API 參數管理</h2>
              </div>
              <button 
                onClick={handleAddConfig}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> 新增一組
              </button>
            </div>
            
            <div className="p-6 md:p-8">
              <form onSubmit={handleSaveLineSettings} className="space-y-8">
                {configs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p>目前沒有任何 Line 設定，請點擊上方按鈕新增。</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {configs.map((config, index) => (
                      <div key={config.id} className={`p-5 rounded-2xl border-2 transition-colors ${config.isActive ? 'border-green-400 bg-green-50/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <input 
                              type="radio" 
                              name="activeLineConfig"
                              checked={config.isActive}
                              onChange={() => handleConfigChange(config.id, 'isActive', true)}
                              className="w-5 h-5 text-green-500 focus:ring-green-500 cursor-pointer"
                            />
                            <label className="font-bold text-slate-700 cursor-pointer">
                              設為目前啟用
                            </label>
                            {config.isActive && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">使用中</span>}
                          </div>
                          
                          <button 
                            type="button"
                            onClick={() => handleRemoveConfig(config.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-slate-600 block mb-1">設定檔名稱</label>
                            <input 
                              type="text" 
                              value={config.name}
                              onChange={(e) => handleConfigChange(config.id, 'name', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-green-500 outline-none bg-white"
                              placeholder="例如：一號店、測試環境"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-slate-600 block mb-1">LIFF ID (前端)</label>
                            <input 
                              type="text" 
                              value={config.liffId}
                              onChange={(e) => handleConfigChange(config.id, 'liffId', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-green-500 outline-none font-mono text-sm bg-white"
                              placeholder="165xxxxxxx-xxxxxxx"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-slate-600 block mb-1">Channel Access Token (後端)</label>
                            <input 
                              type="text" 
                              value={config.channelAccessToken}
                              onChange={(e) => handleConfigChange(config.id, 'channelAccessToken', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-green-500 outline-none font-mono text-sm bg-white"
                              placeholder="長效 Token"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.text && (
                  <div className={`p-4 rounded-xl flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 shrink-0" />}
                    <span className="text-sm font-medium">{message.text}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={saving || configs.length === 0}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-green-500/20"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  儲存 Line 設定
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Confirm Action Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 mb-8">{confirmModal.message}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, type: '', id: null, title: '', message: '' })}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={executeAction}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                  確定刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
