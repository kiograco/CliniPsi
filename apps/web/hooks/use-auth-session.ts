'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearSession,
  getSession,
  saveSession
} from '@/services/api-client';
import type { AuthSession } from '@/types/mvp';

export function useAuthSession() {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionState(getSession());
    setReady(true);
  }, []);

  const setSession = useCallback((nextSession: AuthSession) => {
    saveSession(nextSession);
    setSessionState(nextSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  return {
    ready,
    session,
    setSession,
    logout
  };
}
