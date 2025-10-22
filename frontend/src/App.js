import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { DashboardProvider } from './context/DashboardContext';
import { Dashboard } from './components/Dashboard';
import '@/App.css';

function App() {
  return (
    <BrowserRouter>
      <DashboardProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </DashboardProvider>
    </BrowserRouter>
  );
}

export default App;