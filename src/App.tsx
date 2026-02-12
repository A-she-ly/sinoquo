import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import QuotationPage from './pages/QuotationPage';
import SupplierPage from './pages/SupplierPage';
import ManualPage from './pages/ManualPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/details/:id" element={<ProductDetailsPage />} />
          <Route path="/quotation" element={<QuotationPage />} />
          <Route path="/suppliers" element={<SupplierPage />} />
          <Route path="/manual" element={<ManualPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
