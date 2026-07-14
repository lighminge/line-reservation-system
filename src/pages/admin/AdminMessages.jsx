import { useState, useEffect, useRef } from 'react';
import { MessageSquare, UploadCloud, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getMessageTemplates, saveMessageTemplates, uploadImage, resolveImageUrl } from '../../services/db';

export default function AdminMessages() {
  const [templates, setTemplates] = useState({
    clientSuccess: { title: '', text: '', imageUrl: '' },
    lineConfirm: { title: '', text: '', imageUrl: '' }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const clientFileRef = useRef(null);
  const lineFileRef = useRef(null);
  
  const [clientFile, setClientFile] = useState(null);
  const [lineFile, setLineFile] = useState(null);
  
  const [clientPreview, setClientPreview] = useState('');
  const [linePreview, setLinePreview] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const data = await getMessageTemplates();
    if (data) {
      setTemplates(data);
      if (data.clientSuccess?.imageUrl) {
        setClientPreview(await resolveImageUrl(data.clientSuccess.imageUrl));
      }
      if (data.lineConfirm?.imageUrl) {
        setLinePreview(await resolveImageUrl(data.lineConfirm.imageUrl));
      }
    }
    setLoading(false);
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'client') {
          setClientFile(file);
          setClientPreview(reader.result);
        } else {
          setLineFile(file);
          setLinePreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      let finalClientImg = templates.clientSuccess.imageUrl;
      let finalLineImg = templates.lineConfirm.imageUrl;

      if (clientFile) {
        finalClientImg = await uploadImage(clientFile, `messages/${Date.now()}_client_${clientFile.name}`);
      }
      if (lineFile) {
        finalLineImg = await uploadImage(lineFile, `messages/${Date.now()}_line_${lineFile.name}`);
      }

      const finalTemplates = {
        clientSuccess: { ...templates.clientSuccess, imageUrl: finalClientImg },
        lineConfirm: { ...templates.lineConfirm, imageUrl: finalLineImg }
      };

      await saveMessageTemplates(finalTemplates);
      
      setTemplates(finalTemplates);
      setClientFile(null);
      setLineFile(null);
      setMessage({ text: '訊息畫面設定儲存成功！', type: 'success' });
    } catch (error) {
      let errorMsg = error.message;
      if (errorMsg.includes('unauthorized')) {
        errorMsg += " (請檢查 Firebase Storage 的安全性規則是否允許寫入)";
      }
      setMessage({ text: '儲存失敗: ' + errorMsg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 comic-theme">
      <div>
        <h1 className="text-3xl font-bold text-black font-black">預約訊息畫面管理</h1>
        <p className="text-black font-bold mt-2">自訂客戶端送出預約後的成功畫面，以及 Line 官方帳號的推播確認訊息。</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Client Web Success Screen */}
        <div className="bg-white comic-box overflow-hidden flex flex-col">
          <div className="bg-blue-600 p-5 text-white flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              客戶預約成功推播 (LINE)
            </h2>
            <span className="text-blue-100 text-sm">客戶送出預約後收到</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">主標題</label>
              <input 
                type="text" 
                value={templates.clientSuccess.title}
                onChange={e => setTemplates({...templates, clientSuccess: {...templates.clientSuccess, title: e.target.value}})}
                className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-blue-500 bg-white outline-none"
                placeholder="例如：預約已送出！"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">
                內文說明
                <span className="text-xs text-blue-500 font-normal ml-2">支援變數：{'{好友的顯示名稱}'}、{'{帳號名稱}'}</span>
              </label>
              <textarea 
                value={templates.clientSuccess.text}
                onChange={e => setTemplates({...templates, clientSuccess: {...templates.clientSuccess, text: e.target.value}})}
                className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-blue-500 bg-white outline-none h-32 resize-none"
                placeholder="請輸入成功提示文字"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">上方圖案 (選項)</label>
              <div 
                onClick={() => clientFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden relative group"
              >
                {clientPreview ? (
                  <>
                    <img src={clientPreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500" />
                    <span className="text-sm text-black font-bold group-hover:text-blue-600 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={clientFileRef} onChange={e => handleImageChange(e, 'client')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {clientPreview && (
                <button type="button" onClick={() => { setClientPreview(''); setClientFile(null); setTemplates({...templates, clientSuccess: {...templates.clientSuccess, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline">移除圖片</button>
              )}
              <div className="mt-3 bg-slate-100 p-3 border-2 border-black border border-black">
                <ul className="text-xs text-black font-bold space-y-1 list-disc list-inside">
                  <li><span className="font-semibold text-black font-black">支援檔案類型</span>：JPG, JPEG, PNG。</li>
                  <li><span className="font-semibold text-black font-black">檔案大小限制</span>：建議 1MB 以下，以確保載入速度。</li>
                  <li><span className="font-semibold text-black font-black">檔案比例建議</span>：推薦使用 20:13 (橫式) 比例，以達到最佳顯示效果。</li>
                  <li><span className="font-semibold text-black font-black">上傳設計建議</span>：由於推播文字會顯示在圖片下方，圖片可著重視覺氛圍呈現，不需包含過多說明文字或壓字。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Line Flex Message Confirm */}
        <div className="bg-white comic-box overflow-hidden flex flex-col">
          <div className="bg-green-600 p-5 text-white flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Line 確認推播訊息
            </h2>
            <span className="text-green-100 text-sm">管理員點擊確認後發送</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-6 flex-1 bg-slate-50">
            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">主標題</label>
              <input 
                type="text" 
                value={templates.lineConfirm.title}
                onChange={e => setTemplates({...templates, lineConfirm: {...templates.lineConfirm, title: e.target.value}})}
                className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 bg-white outline-none"
                placeholder="例如：預約成功確認"
              />
            </div>
            
            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">
                內文說明 (下方會自動附上時間等資訊)
                <span className="text-xs text-green-600 font-normal ml-2">支援變數：{'{好友的顯示名稱}'}、{'{帳號名稱}'}</span>
              </label>
              <textarea 
                value={templates.lineConfirm.text}
                onChange={e => setTemplates({...templates, lineConfirm: {...templates.lineConfirm, text: e.target.value}})}
                className="w-full p-3 border-2 border-black comic-box-sm border border-black focus:border-green-500 bg-white outline-none h-32 resize-none"
                placeholder="例如：期待您的到來！"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-black font-black block mb-2">卡片橫幅圖案 (選項)</label>
              <div 
                onClick={() => lineFileRef.current?.click()}
                className="w-full h-40 border-2 border-black comic-box-sm border-2 border-dashed border-black bg-white flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors overflow-hidden relative group"
              >
                {linePreview ? (
                  <>
                    <img src={linePreview} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-medium flex items-center"><UploadCloud className="w-5 h-5 mr-2" /> 更換圖片</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:text-green-500" />
                    <span className="text-sm text-black font-bold group-hover:text-green-600 font-medium">點擊上傳圖片</span>
                  </>
                )}
              </div>
              <input type="file" ref={lineFileRef} onChange={e => handleImageChange(e, 'line')} accept="image/jpeg, image/png, image/jpg" className="hidden" />
              {linePreview && (
                <button type="button" onClick={() => { setLinePreview(''); setLineFile(null); setTemplates({...templates, lineConfirm: {...templates.lineConfirm, imageUrl: ''}}) }} className="text-red-500 text-xs mt-2 hover:underline">移除圖片</button>
              )}
              <div className="mt-3 bg-slate-100 p-3 border-2 border-black border border-black">
                <ul className="text-xs text-black font-bold space-y-1 list-disc list-inside">
                  <li><span className="font-semibold text-black font-black">支援檔案類型</span>：JPG, JPEG, PNG。</li>
                  <li><span className="font-semibold text-black font-black">檔案大小限制</span>：建議 1MB 以下，以確保載入速度。</li>
                  <li><span className="font-semibold text-black font-black">檔案比例建議</span>：推薦使用 20:13 (橫式) 比例，以達到最佳顯示效果。</li>
                  <li><span className="font-semibold text-black font-black">上傳設計建議</span>：由於推播文字會顯示在圖片下方，圖片可著重視覺氛圍呈現，不需包含過多說明文字或壓字。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="lg:col-span-2">
          {message.text && (
            <div className={`p-4 border-2 border-black comic-box-sm flex items-center mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 shrink-0" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={saving}
            className="w-full md:w-auto md:min-w-[200px] mx-auto block bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold py-4 px-8 border-2 border-black comic-box-sm transition-colors shadow-lg shadow-slate-800/20"
          >
            <div className="flex items-center justify-center">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              儲存所有訊息設定
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}
