import { useEffect, useState } from 'react';
import { supabase } from '../../core/supabase';

export default function Config() {
  const [phone, setPhone] = useState('');
  useEffect(() => {
    supabase.from('user_profiles').select('*, businesses(*)').single().then(({data})=>{
      if(data?.businesses?.whatsapp_number) setPhone(data.businesses.whatsapp_number);
    });
  }, []);
  return (
    <div style={{padding:16}}>
      <h3>Configuración</h3>
      <label>Teléfono WhatsApp Negocio:</label>
      <input value={phone} onChange={e=>setPhone(e.target.value)} style={{padding:8, marginLeft:8}}/>
      <p style={{fontSize:12, color:'#666', marginTop:8}}>Se usará para enviar comprobantes automáticamente.</p>
    </div>
  );
}