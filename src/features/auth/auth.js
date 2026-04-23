import { create } from 'zustand';
import { supabase } from '../../core/supabase';

export const useAuthStore = create((set) => ({
  session: null,
  business: null,
  isLoaded: false,

  init: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session || null;
      
      if (session) {
        await loadBusiness(session, set);
      } else {
        set({ session: null, business: null, isLoaded: true });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          await loadBusiness(session, set);
        } else {
          set({ session: null, business: null, isLoaded: true });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
      set({ session: null, business: null, isLoaded: true });
    }
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    
    if (data.session) {
      await loadBusiness(data.session, set);
    }
    
    return data;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, business: null, isLoaded: true });
  }
}));

async function loadBusiness(session, set) {
  try {
    const businessId = session.user.user_metadata?.business_id;
    
    if (!businessId) {
      set({ session, business: null, isLoaded: true });
      return;
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, whatsapp_number, currency')
      .eq('id', businessId)
      .single();

    if (error || !data) {
      console.error('Error loading business:', error);
      set({ session, business: null, isLoaded: true });
      return;
    }

    set({ session, business: data, isLoaded: true });
  } catch (err) {
    console.error('Exception loading business:', err);
    set({ session, business: null, isLoaded: true });
  }
}

