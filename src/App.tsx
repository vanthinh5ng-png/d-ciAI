/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useStore } from './store';
import { Toaster } from 'sonner';

import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import CameraScan from './pages/CameraScan';
import Chatbot from './pages/Chatbot';
import Inventory from './pages/Inventory';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser, setLoading } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u && location.pathname !== '/login') {
        navigate('/login');
      } else if (u && location.pathname === '/login') {
        navigate('/');
      }
    });
    return unsub;
  }, [navigate, location.pathname, setUser, setLoading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading MediSync...</div>;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <div className="max-w-md mx-auto bg-gray-50 min-h-[100dvh] pb-20 shadow-xl overflow-x-hidden relative">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/chat" element={<Chatbot />} />
            </Route>
            <Route path="/scan" element={<CameraScan />} />
          </Routes>
          <Toaster position="top-center" />
        </div>
      </AuthGuard>
    </BrowserRouter>
  );
}

