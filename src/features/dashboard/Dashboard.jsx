import { useState, useEffect } from 'react';
import { useAuthStore } from '../auth/auth';
import { getDailySales, getTopProducts, exportToCSV } from './report';
import { dbPromise } from '../../core/db';

export default function Dashboard() {
  const business = useAuthStore(s => s.business);
  const [stats, setStats] = useState({ count: 0, total: 0 });
  const [pending, setPending] = useState(0);
  const [top, setTop] = useState([]);

  useEffect(() => {
    const load = async () => {
      const sales = await getDailySales();
      setStats({ count: sales.length, total: sales.reduce((a,b) => a + b.total, 0) });
      const q = await (await dbPromise).getAll('sync_queue');
      setPending(q.filter(x => x.status === 'pending').length);
      setTop(await getTopProducts());
    };
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>📊 Dashboard - {business?.name || 'Bina POS'}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Ventas Hoy</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0 0' }}>{stats.count}</p>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Ingresos Hoy</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0 0', color: '#10b981' }}>${stats.total.toFixed(2)}</p>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Sync Pendiente</h3>
          <p style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0 0', color: pending > 0 ? '#f59e0b' : '#10b981' }}>{pending}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>🏆 Productos Más Vendidos</h3>
        <button onClick={exportToCSV} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>📥 Exportar CSV</button>
      </div>
      <ul style={{ background: '#fff', padding: 20, borderRadius: 10, listStyle: 'none', margin: 0 }}>
        {top.map(([id, qty], i) => (
          <li key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < top.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
            <span>#{i+1} ID: {id.slice(0,8)}...</span>
            <strong>{qty} uds</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}