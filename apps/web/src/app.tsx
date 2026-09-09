import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './pages/app-layout.js';
import { LoginPage } from './pages/login-page.js';
import { RegisterPage } from './pages/register-page.js';
import { CreateAuctionPage } from './pages/create-auction-page.js';
import { AuctionsPage } from './pages/auctions-page.js';
import { AuctionDetailPage } from './pages/auction-detail-page.js';
import { PurchasesPage } from './pages/purchases-page.js';
import { ProfilePage } from './pages/profile-page.js';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<AuctionsPage />} />
          <Route path="/auctions/new" element={<CreateAuctionPage />} />
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
