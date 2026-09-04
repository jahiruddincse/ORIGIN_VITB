import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClaimsExplorer from './pages/ClaimsExplorer';
import ClaimDetail from './pages/ClaimDetail';
import StateIntelligence from './pages/StateIntelligence';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/claims" element={<ClaimsExplorer />} />
          <Route path="/claims/:claimId" element={<ClaimDetail />} />
          <Route path="/states" element={<StateIntelligence />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
