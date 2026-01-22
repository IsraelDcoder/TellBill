import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ClientPortalPage from './pages/ClientPortalPage';
import '../styles/portal.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/view/:token" element={<ClientPortalPage />} />
        <Route path="/" element={<ClientPortalPage />} />
      </Routes>
    </Router>
  );
}
