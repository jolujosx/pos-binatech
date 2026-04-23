import { openDB } from 'idb';

export const dbPromise = openDB('bina-pos-db', 1, {
  upgrade(db, oldVersion, newVersion) {
    console.log('📦 Actualizando DB de v' + oldVersion + ' a v' + newVersion);
    
    if (!db.objectStoreNames.contains('products')) {
      const store = db.createObjectStore('products', { keyPath: 'id' });
      store.createIndex('barcode', 'barcode', { unique: false });
      console.log('✅ Store "products" creado');
    }
    
    if (!db.objectStoreNames.contains('sales')) {
      db.createObjectStore('sales', { keyPath: 'id' });
      console.log('✅ Store "sales" creado');
    }
    
    if (!db.objectStoreNames.contains('sale_items')) {
      const store = db.createObjectStore('sale_items', { keyPath: 'id' });
      store.createIndex('sale_id', 'sale_id', { unique: false });
      console.log('✅ Store "sale_items" creado');
    }
    
    if (!db.objectStoreNames.contains('sync_queue')) {
      const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
      store.createIndex('status', 'status', { unique: false });
      console.log('✅ Store "sync_queue" creado');
    }
  }
});

// ✅ Exportación compatible para imports antiguos
export const db = dbPromise;