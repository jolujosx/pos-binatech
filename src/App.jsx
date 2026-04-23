import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/auth/auth';
import Login from './features/auth/Login';
import POS from './features/pos/POS';
import Dashboard from './features/dashboard/Dashboard';
import Productos from './features/productos/Productos';
import Header from './features/negocio/Header';
import Admin from './admin/Admin';

// Componente para proteger rutas de Admin
const AdminRoute = ({ children }) => {
  const { session } = useAuthStore();
  const role = session?.user?.user_metadata?.role;

  if (!session) return <Navigate to="/" replace />;
  if (role !== 'admin') {
    alert('⛔ Acceso denegado. Solo administradores.');
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { session, isLoaded, init } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await init();
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, [init]);

  if (isInitializing || !isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f1f5f9'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', margin: 0 }}>🏪 Bina POS</h2>
          <p style={{ color: '#64748b', margin: '8px 0 0' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Header />
      <Routes>
        <Route path="/" element={<POS />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;