import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReservationForm from './pages/ReservationForm';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReservationForm />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
