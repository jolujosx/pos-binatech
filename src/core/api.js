import { supabase } from './supabase';
import { dbPromise } from './db';

export const fetchInitialData = async (businessId) => {
  const { data, error } = await supabase.from('products').select('*').eq('business_id', businessId);
  if (error) throw error;
  
  const db = await dbPromise;
  const tx = db.transaction('products', 'readwrite');
  for (const p of data) await tx.store.put(p);
  await tx.done;
  
  return data;
};

export const fetchRemoteProducts = async (businessId) => {
  const { data, error } = await supabase.from('products').select('*').eq('business_id', businessId);
  if (error) throw error;
  
  const db = await dbPromise;
  const tx = db.transaction('products', 'readwrite');
  for (const p of data) await tx.store.put(p);
  await tx.done;
  
  return data;
};

export const sendWhatsApp = async (phone, message, businessName) => {
  try {
    await supabase.functions.invoke('send-whatsapp', { 
      body: { phone, message, businessName } 
    });
  } catch (err) { 
    console.warn('WhatsApp error:', err); 
  }
};

