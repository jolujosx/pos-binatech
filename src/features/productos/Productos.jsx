import { useState, useEffect, useCallback } from 'react';
import { dbPromise } from '../../core/db';
import { supabase } from '../../core/supabase';
import { useAuthStore } from '../auth/auth';
import toast from 'react-hot-toast';

export default function Productos() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '', barcode: '' });
  const [loading, setLoading] = useState(false);
  
  const business = useAuthStore(s => s.business);
  const session = useAuthStore(s => s.session);
  const role = session?.user?.user_metadata?.role;
  const isAdmin = role === 'admin';

  // ✅ useCallback para memoizar
  const loadProducts = useCallback(async () => {
    try {
      const db = await dbPromise;
      const local = await db.getAll('products');
      setProducts(local);
    } catch (err) {
      console.error('Error cargando productos:', err);
      toast.error('No se pudieron cargar los productos');
    }
  }, []);

  // ✅ useEffect con dependencia correcta
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Agregar/Actualizar producto (SOLO ADMIN)
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    setLoading(true);
    try {
      const newProd = {
        id: crypto.randomUUID(),
        business_id: business.id,
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        barcode: form.barcode || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('products').insert(newProd);
      if (error) throw error;

      const db = await dbPromise;
      await db.put('products', newProd);

      await loadProducts();
      setForm({ name: '', price: '', stock: '', barcode: '' });
      toast.success('✅ Producto agregado correctamente');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, color: '#0f172a' }}>📦 Gestión de Productos</h2>

      {/* SOLO ADMIN: Formulario de agregado */}
      {isAdmin && (
        <div style={{
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#0f172a' }}>➕ Agregar Nuevo Producto</h3>
          <form onSubmit={handleAdd} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12
          }}>
            <input
              placeholder="Nombre del producto *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Precio ($) *"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }}
              required
            />
            <input
              type="number"
              placeholder="Stock inicial"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }}
            />
            <input
              placeholder="Código de barras (opcional)"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: 12,
                background: loading ? '#94a3b8' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Agregando...' : '➕ Agregar Producto'}
            </button>
          </form>
        </div>
      )}

      {/* SOLO CAJERO: Mensaje de solo lectura */}
      {!isAdmin && (
        <div style={{
          padding: 16,
          background: '#fef3c7',
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid #fbbf24'
        }}>
          <p style={{ margin: 0, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            ℹ️ <strong>Modo solo lectura:</strong> Contacta al administrador para modificar productos.
          </p>
        </div>
      )}

      {/* Tabla de productos (VISIBLE PARA TODOS) */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0 }}>📋 Listado de Productos ({products.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Precio</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Stock</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Código</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 12, fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: 12, textAlign: 'right', color: '#2563eb', fontWeight: 'bold' }}>
                    ${Number(p.price).toFixed(2)}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span style={{
                      color: p.stock <= 5 ? '#ef4444' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                    {p.barcode || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              No hay productos registrados
            </p>
          )}
        </div>
      </div>
    </div>
  );
}