import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReservationForm from './pages/ReservationForm';
import AdminLayout from './components/AdminLayout';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAvailability from './pages/admin/AdminAvailability';
import AdminReservations from './pages/admin/AdminReservations';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMessages from './pages/admin/AdminMessages';
import AdminScheduling from './pages/admin/AdminScheduling';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 前台：客戶預約頁面 */}
        <Route path="/" element={<ReservationForm />} />
        
        {/* 後台：管理員版面 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminReservations />} /> {/* 預設顯示預約管理 */}
          <Route path="users" element={<AdminUsers />} />
          <Route path="availability" element={<AdminAvailability />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="scheduling" element={<AdminScheduling />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="messages" element={<AdminMessages />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
