import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/home-page.js';
import { LoginPage } from './pages/login-page.js';
import { RegisterPage } from './pages/register-page.js';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
