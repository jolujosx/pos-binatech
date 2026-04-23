import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnline } from '../../hooks/useOnline';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useAuthStore } from '../auth/auth';
import { dbPromise } from '../../core/db';
import { processSyncQueue } from '../../core/sync';
import toast from 'react-hot-toast';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendReceipt, setSendReceipt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isOnline = useOnline();
  const { scannedCode, reset: resetScanner } = useBarcodeScanner(120);
  const searchInputRef = useRef(null);
  const session = useAuthStore(s => s.session);
  const business = useAuthStore(s => s.business);
  const businessId = session?.user?.user_metadata?.business_id;

  // ✅ FUNCIÓN DECLARADA ANTES DEL useEffect
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

  // ✅ useEffect CON DEPENDENCIA CORRECTA
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ✅ AGREGAR AL CARRITO
  const addToCart = useCallback((product) => {
    if (!product || product.stock <= 0) {
      toast.warning('⚠️ Sin stock disponible');
      return false;
    }

    setCart(prevCart => {
      const existing = prevCart.find(i => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          toast.warning('Stock máximo alcanzado');
          return prevCart;
        }
        return prevCart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
    return true;
  }, []);

  // ✅ ESCÁNER
  useEffect(() => {
    if (!scannedCode || products.length === 0) return;
    
    const found = products.find(p => 
      p.barcode === scannedCode || 
      p.id === scannedCode || 
      p.name?.toLowerCase().includes(scannedCode.toLowerCase())
    );

    if (found) {
      setTimeout(() => {
        const success = addToCart(found);
        if (success) {
          toast.success(`📷 Escaneado: ${found.name}`);
        }
      }, 0);
    } else {
      toast.error(`No encontrado: ${scannedCode}`);
    }
    resetScanner();
    searchInputRef.current?.focus();
  }, [scannedCode, products, resetScanner, addToCart]);

  // ✅ AUTO-SYNC
  useEffect(() => {
    if (isOnline && businessId) {
      processSyncQueue(businessId);
    }
  }, [isOnline, businessId]);

  // ✅ ENFOQUE
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ✅ ACTUALIZAR CANTIDAD
  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > i.stock) {
          toast.warning('Stock insuficiente');
          return i;
        }
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(Boolean));
  }, []);

  // ✅ ELIMINAR
  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  // ✅ LIMPIAR
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // ✅ CHECKOUT CORREGIDO
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!businessId) {
      console.error('❌ CRITICAL ERROR: businessId is missing');
      toast.error('Error de configuración: ID de negocio no encontrado');
      return;
    }

    setIsLoading(true);

    try {
      const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
      const saleId = crypto.randomUUID();
      
      const sale = {
        id: saleId,
        business_id: businessId,
        total,
        customer_phone: sendReceipt ? customerPhone : null,
        status: 'completed',
        local_id: saleId,
        created_at: new Date().toISOString()
      };

      const items = cart.map(i => ({
        id: crypto.randomUUID(),
        sale_id: saleId,
        product_id: i.id,
        quantity: i.qty,
        unit_price: i.price,
        subtotal: Number((i.price * i.qty).toFixed(2))
      }));

      // ✅ CORRECCIÓN: Usar db directamente en lugar de tx.store
      const db = await dbPromise;
      const tx = db.transaction(['sales', 'sale_items', 'sync_queue', 'products'], 'readwrite');

      // Guardar venta
      await tx.objectStore('sales').put(sale);
      
      // Guardar items
      for (const item of items) {
        await tx.objectStore('sale_items').put(item);
      }

      // Encolar sync
      await tx.objectStore('sync_queue').put({
        id: crypto.randomUUID(),
        business_id: businessId,
        table_name: 'sales',
        operation: 'insert',
        payload: sale,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      await tx.objectStore('sync_queue').put({
        id: crypto.randomUUID(),
        business_id: businessId,
        table_name: 'sale_items',
        operation: 'insert',
        payload: items,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Encolar actualización de stock
      for (const cItem of cart) {
        await tx.objectStore('sync_queue').put({
          id: crypto.randomUUID(),
          business_id: businessId,
          table_name: 'products',
          operation: 'update',
          payload: { product_id: cItem.id, delta: -cItem.qty },
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      // Actualizar stock local
      const updatedProducts = products.map(p => {
        const sold = cart.find(c => c.id === p.id);
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
      });

      for (const p of updatedProducts) {
        if (cart.some(c => c.id === p.id)) {
          await tx.objectStore('products').put(p);
        }
      }
      
      await tx.done;
      console.log('✅ Venta guardada localmente');

      // Actualizar UI
      setCart([]);
      setCustomerPhone('');
      setSendReceipt(false);
      setProducts(updatedProducts);
      toast.success('✅ Venta registrada correctamente');

      // WhatsApp opcional
      if (sendReceipt && customerPhone) {
        const bizName = business?.name || 'Tu Tienda';
        const msg = `🏪 *${bizName}*\n\n📅 ${new Date().toLocaleDateString()}\n💰 Total: $${total.toFixed(2)}\n\n✅ ¡Gracias por su compra!`;
        window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      // Sincronizar si hay internet
      if (isOnline) {
        processSyncQueue(businessId);
      }
    } catch (err) {
      console.error('❌ Error en checkout:', err);
      toast.error('Error al procesar: ' + err.message);
    } finally {
      setIsLoading(false);
      searchInputRef.current?.focus();
    }
  }, [cart, businessId, sendReceipt, customerPhone, products, business, isOnline, processSyncQueue]);

  // ✅ FILTRAR
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  // ✅ RENDER
  return (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 80px)', padding: '12px', background: '#f1f5f9' }}>
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="🔍 Buscar nombre o escanear código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
        />

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', padding: '4px' }}>
          {filteredProducts.length === 0 && (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', marginTop: '60px' }}>No se encontraron productos</p>
          )}
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock <= 0}
              style={{
                padding: '12px',
                background: p.stock > 0 ? '#ffffff' : '#f8fafc',
                border: `1px solid ${p.stock > 0 ? '#e2e8f0' : '#f1f5f9'}`,
                borderRadius: '10px',
                cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                textAlign: 'left',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                opacity: p.stock <= 0 ? 0.6 : 1
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '15px' }}>${Number(p.price).toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: p.stock > 5 ? '#64748b' : '#ef4444', marginTop: '2px' }}>
                {p.stock > 0 ? `Stock: ${p.stock}` : 'Agotado'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>🛒 Carrito</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '14px' }}>📱 Enviar comprobante por WhatsApp</span>
          </label>
          {sendReceipt && (
            <input type="tel" placeholder="Teléfono cliente" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', marginTop: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>Agrega productos para iniciar</p>
          ) : (
            cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>${Number(item.price).toFixed(2)} / ud</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => updateQty(item.id, -1)} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }}>-</button>
                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '600' }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' }}>+</button>
                  <button onClick={() => removeFromCart(item.id)} style={{ marginLeft: '8px', color: '#ef4444', background: 'none', border: 'none' }}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' }}>
            <span>Total:</span><span>${cart.reduce((sum, i) => sum + (i.price * i.qty), 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={clearCart} disabled={cart.length === 0} style={{ flex: 1, padding: '12px', background: '#e2e8f0', border: 'none', borderRadius: '8px' }}>Limpiar</button>
            <button onClick={handleCheckout} disabled={cart.length === 0 || isLoading} style={{ flex: 2, padding: '14px', background: cart.length && !isLoading ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
              {isLoading ? '⏳ Procesando...' : '💾 Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}