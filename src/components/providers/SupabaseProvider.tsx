'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseContext = {
  supabase: SupabaseClient | null;
  isConfigured: boolean;
};

const Context = createContext<SupabaseContext>({
  supabase: null,
  isConfigured: false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    setIsConfigured(client !== null);
  }, []);

  return (
    <Context.Provider value={{ supabase, isConfigured }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  return context;
}
