import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { TermsModal } from './components/common/TermsModal';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { HomePage } from './pages/HomePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { DealerDashboardPage } from './pages/DealerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SavedPropertiesPage } from './pages/SavedPropertiesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AddPropertyWizard } from './components/dealer/AddPropertyWizard';

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-brand-700 selection:text-white">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/land-sale" element={<PropertiesPage presetType="land_sale" />} />
              <Route path="/properties/house-sale" element={<PropertiesPage presetType="house_sale" />} />
              <Route path="/properties/house-rent" element={<PropertiesPage presetType="house_rent" />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              
              {/* Dealer Flows */}
              <Route path="/dealer/dashboard" element={<DealerDashboardPage />} />
              <Route path="/dealer/add-property" element={<AddPropertyWizard />} />
              
              {/* Customer Flows */}
              <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
              <Route path="/saved-properties" element={<SavedPropertiesPage />} />
              
              {/* Admin Control Center */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              
              {/* Public Info */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              
              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          <Footer />

          {/* Mandatory First-Open Notice Bilingual Modal */}
          <TermsModal />

          {/* Global Interactive Toast Feedback */}
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
