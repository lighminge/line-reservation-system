import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, CalendarDays, CalendarCheck, Settings, Lock, Menu, X, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';
import { getAdminPassword } from '../services/db';

export default function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Simple session persistence using sessionStorage for admin login
  useEffect(() => {
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const dbPassword = await getAdminPassword();
      if (password === dbPassword) {
        setIsAuthenticated(true);
        sessionStorage.setItem('adminAuth', 'true');
        setError('');
      } else {
        setError('密碼錯誤');
      }
    } catch (err) {
      setError('驗證失敗，請稍後再試');
    }
  };

  const navItems = [
    { name: '預約管理', path: '/admin/reservations', icon: CalendarCheck },
    { name: '預約設定', path: '/admin/availability', icon: CalendarDays },
    { name: '用戶管理', path: '/admin/users', icon: Users },
    { name: '訊息設定', path: '/admin/messages', icon: MessageSquare },
    { name: '系統設定', path: '/admin/settings', icon: Settings },
  ];

  if (!isAuthenticated) {
    return (
      <div className="comic-theme flex flex-col items-center justify-center min-h-screen bg-pink-100 p-6">
        <div className="bg-white p-8 max-w-sm w-full comic-box">
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-300 p-4 comic-box-sm">
              <Lock className="w-8 h-8 text-black" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-black mb-2">管理員控制台</h1>
          <p className="text-center text-black font-bold mb-6 text-sm">請輸入密碼以繼續</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 comic-input bg-cyan-100 focus:bg-white placeholder-slate-500 font-bold"
                placeholder="管理員密碼"
                required
              />
            </div>
            {error && <p className="bg-red-400 text-white p-2 rounded text-sm text-center font-bold border-2 border-black shadow-[2px_2px_0_0_#000]">{error}</p>}
            <button type="submit" className="w-full bg-green-400 text-black font-black py-4 comic-button text-lg">
              登入
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="comic-theme min-h-screen bg-pink-100 flex flex-col md:flex-row font-bold selection:bg-yellow-300 selection:text-black">
      {/* Mobile Header */}
      <div className="md:hidden bg-yellow-300 border-b-[3px] border-black p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="font-black text-xl text-black">Admin Dashboard</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-black bg-white comic-box-sm">
          {isMobileMenuOpen ? <X className="w-6 h-6" strokeWidth={3} /> : <Menu className="w-6 h-6" strokeWidth={3} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-0 z-40 bg-cyan-200 border-r-[3px] border-black md:w-64 flex-col transition-transform transform md:translate-x-0 md:flex",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b-[3px] border-black hidden md:block bg-yellow-300">
          <h1 className="text-3xl font-black text-black tracking-tighter transform -rotate-2 inline-block">
            AdminPanel
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-3 mt-16 md:mt-0 bg-cyan-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/admin/reservations' && location.pathname === '/admin');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 comic-nav-item bg-white",
                  isActive ? "active" : "text-black"
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 3 : 2} />
                <span className="text-lg">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t-[3px] border-black bg-white">
          <button 
            onClick={() => {
              sessionStorage.removeItem('adminAuth');
              setIsAuthenticated(false);
            }}
            className="w-full text-center px-4 py-3 text-base font-black text-black comic-button bg-red-400 hover:bg-red-500"
          >
            登出系統
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto relative z-0">
        {/* Comic dots background pattern via tailwind arbitrary values */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
        <div className="max-w-6xl mx-auto p-4 md:p-8 relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
