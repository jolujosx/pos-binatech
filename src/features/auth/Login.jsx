import { useState } from 'react';
import { useAuthStore } from './auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await login(email, password); toast.success('Sesión iniciada'); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300, margin: '100px auto' }}>
      <h2>Bina POS</h2>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%', marginBottom:8, padding:8}}/>
      <input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%', marginBottom:8, padding:8}}/>
      <button type="submit" style={{width:'100%', padding:8}}>Entrar</button>
    </form>
  );
}