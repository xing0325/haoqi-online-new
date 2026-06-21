"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/browser";
import type { Role } from "@/lib/types";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  avatar_url: string | null;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase()
      .from("profiles")
      .select("id, display_name, role, avatar_url")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setProfile((data as Profile) ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  return <Ctx.Provider value={{ session, profile, loading, signOut }}>{children}</Ctx.Provider>;
}
