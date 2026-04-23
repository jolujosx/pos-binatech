import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../core/supabase';
import { dbPromise } from '../core/db';
import { useAuthStore } from '../features/auth/auth';
import toast from 'react-hot-toast';

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '', barcode: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const business = useAuthStore(s => s.business);

  // ✅ useCallback para memoizar la función
  const loadProducts = useCallback(async () => {
    try {
      const db = await dbPromise;
      const local = await db.getAll('products');
      setProducts(local);
    } catch (err) {
      console.error('Error cargando productos:', err);
      toast.error('No se pudieron cargar los productos');
    }
  }, []); // Sin dependencias - solo usa setProducts

  // ✅ useEffect con loadProducts en dependencias
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Agregar/Actualizar producto
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        id: editingId || crypto.randomUUID(),
        business_id: business.id,
        name: form.name,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        barcode: form.barcode || null,
        updated_at: new Date().toISOString()
      };

      if (!editingId) {
        productData.created_at = new Date().toISOString();
      }

      const { error } = editingId
        ? await supabase.from('products').update(productData).eq('id', editingId)
        : await supabase.from('products').insert(productData);

      if (error) throw error;

      const db = await dbPromise;
      await db.put('products', productData);

      toast.success(editingId ? '✅ Producto actualizado' : '✅ Producto agregado');
      setForm({ name: '', price: '', stock: '', barcode: '' });
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al guardar producto');
    } finally {
      setLoading(false);
    }
  };

  // Editar producto
  const handleEdit = (product) => {
    setForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      barcode: product.barcode || ''
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Eliminar producto
  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      const db = await dbPromise;
      await db.delete('products', id);

      toast.success('🗑️ Producto eliminado');
      await loadProducts();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al eliminar producto');
    }
  };

  // Actualizar stock rápido
  const updateStock = async (id, delta) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = Math.max(0, product.stock + delta);

    try {
      const updated = { ...product, stock: newStock, updated_at: new Date().toISOString() };

      const { error } = await supabase.from('products').update(updated).eq('id', id);
      if (error) throw error;

      const db = await dbPromise;
      await db.put('products', updated);

      toast.success(`Stock: ${newStock}`);
      await loadProducts();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al actualizar stock');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24, color: '#0f172a' }}>⚙️ Panel de Administración</h2>

      {/* Formulario */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>
          {editingId ? '✏️ Editar Producto' : '➕ Agregar Nuevo Producto'}
        </h3>
        <form onSubmit={handleSubmit} style={{
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
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: 12,
                background: editingId ? '#f59e0b' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '⏳ Guardando...' : editingId ? '💾 Actualizar' : '➕ Agregar Producto'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({ name: '', price: '', stock: '', barcode: '' });
                  setEditingId(null);
                }}
                style={{
                  padding: 12,
                  background: '#64748b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de productos */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0 }}>📦 Productos ({products.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left' }}>Nombre</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Precio</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Stock</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Código</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Acciones</th>
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => updateStock(p.id, -1)}
                        style={{
                          width: 28,
                          height: 28,
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          background: '#f1f5f9',
                          cursor: 'pointer'
                        }}
                      >
                        -
                      </button>
                      <span style={{
                        minWidth: 40,
                        textAlign: 'center',
                        color: p.stock <= 5 ? '#ef4444' : '#10b981',
                        fontWeight: 'bold'
                      }}>
                        {p.stock}
                      </span>
                      <button
                        onClick={() => updateStock(p.id, 1)}
                        style={{
                          width: 28,
                          height: 28,
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          background: '#f1f5f9',
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>
                    {p.barcode || '-'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(p)}
                      style={{
                        marginRight: 8,
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
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