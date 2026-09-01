import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AdminAuthService } from '../services/admin-auth.service';
import type { StaffProfile, PermissionKey } from '../types/rbac';

interface AdminAuthContextType {
  session: Session | null;
  user: User | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isStaff: boolean;
  isLoading: boolean;
  hasPermission: (key: PermissionKey) => boolean;
  hasAnyPermission: (keys: PermissionKey[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshStaffProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStaffData = useCallback(async (userId: string) => {
    try {
      const profile = await AdminAuthService.getStaffContext(userId);
      setStaffProfile(profile);
      return profile;
    } catch (err) {
      console.error('[AdminAuthContext] Failed to load staff context:', err);
      setStaffProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentSession = await AdminAuthService.getSession();
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await loadStaffData(currentSession.user.id);
          }
        }
      } catch (err) {
        console.warn('[AdminAuthContext] Initial session load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = AdminAuthService.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadStaffData(newSession.user.id);
      } else {
        setStaffProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [loadStaffData]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await AdminAuthService.signIn(email, password);
      if (result.success && result.session && result.user) {
        setSession(result.session);
        setUser(result.user);
        setStaffProfile(result.staffProfile);
        return { success: true };
      }
      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await AdminAuthService.signOut();
      setSession(null);
      setUser(null);
      setStaffProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStaffProfile = async () => {
    if (user?.id) {
      await loadStaffData(user.id);
    }
  };

  /**
   * Permission verification: Checks granted permissions array.
   * SUPER_ADMIN automatically satisfies all permission queries.
   */
  const hasPermission = useCallback(
    (key: PermissionKey): boolean => {
      if (!staffProfile || staffProfile.status !== 'ACTIVE') return false;
      if (staffProfile.role === 'SUPER_ADMIN') return true;
      return staffProfile.permissions.includes(key);
    },
    [staffProfile]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[]): boolean => {
      if (!staffProfile || staffProfile.status !== 'ACTIVE') return false;
      if (staffProfile.role === 'SUPER_ADMIN') return true;
      return keys.some((k) => staffProfile.permissions.includes(k));
    },
    [staffProfile]
  );

  const isAuthenticated = Boolean(session && user);
  const isStaff = Boolean(staffProfile?.isStaff && staffProfile?.status === 'ACTIVE');

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        user,
        staffProfile,
        isAuthenticated,
        isStaff,
        isLoading,
        hasPermission,
        hasAnyPermission,
        signIn,
        signOut,
        refreshStaffProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
