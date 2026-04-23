import { dbPromise } from '../../core/db';

export async function getDailySales() {
  const db = await dbPromise;
  const sales = await db.getAll('sales');
  const today = new Date().toISOString().split('T')[0];
  return sales.filter(s => s.created_at.startsWith(today));
}

export async function getTopProducts() {
  const db = await dbPromise;
  const items = await db.getAll('sale_items');
  const counts = {};
  items.forEach(i => {
    counts[i.product_id] = (counts[i.product_id] || 0) + i.quantity;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

export async function exportToCSV() {
  const db = await dbPromise;
  const sales = await db.getAll('sales');
  const items = await db.getAll('sale_items');
  
  const lines = ['Fecha,ID,Total,Teléfono,Productos'];
  
  sales.forEach(s => {
    const prods = items
      .filter(i => i.sale_id === s.id)
      .map(i => `${i.product_id}x${i.quantity}`)
      .join('; ');
    
    lines.push(`${s.created_at},${s.id},${s.total},${s.customer_phone || '-'},${prods}`);
  });
  
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas_bina_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}