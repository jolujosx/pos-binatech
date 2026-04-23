import { supabase } from './supabase';
import { dbPromise } from './db';

export async function processSyncQueue(businessId) {
  try {
    const db = await dbPromise;
    const queue = await db.getAll('sync_queue');
    const pending = queue.filter(q => q.status === 'pending');

    for (const item of pending) {
      try {
        if (item.table_name === 'products' && item.operation === 'update' && item.payload.delta !== undefined) {
          const { error } = await supabase.rpc('safe_stock_delta', {
            p_product_id: item.payload.product_id,
            p_delta: item.payload.delta
          });

          await db.put('sync_queue', { 
            ...item, 
            status: error ? 'failed' : 'synced',
            error_msg: error?.message || null
          });
        } else {
          const { error } = await supabase.from(item.table_name).upsert(item.payload, { onConflict: 'id' });
          
          await db.put('sync_queue', { 
            ...item, 
            status: error ? 'failed' : 'synced',
            error_msg: error?.message || null
          });
        }
      } catch (err) {
        await db.put('sync_queue', { 
          ...item, 
          status: 'failed',
          error_msg: err.message
        });
      }
    }

    // Pull remoto
    const { data: remoteProducts } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId);

    if (remoteProducts) {
      for (const product of remoteProducts) {
        await db.put('products', product);
      }
    }
  } catch (err) {
    console.error('Error en sync:', err);
  }
}
