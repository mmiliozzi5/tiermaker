"use client";

import { useState, useEffect } from "react";
import {
  getStoredName,
  setStoredName,
  getStoredCode,
  setStoredCode,
  clearSession,
} from "@/lib/localStorage";

interface Session {
  name: string;
  code: string;
  hydrated: boolean;
}

export function useSession() {
  const [session, setSession] = useState<Session>({
    name: "",
    code: "",
    hydrated: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      name: getStoredName(),
      code: getStoredCode(),
      hydrated: true,
    });
  }, []);

  function setName(value: string) {
    setSession((prev) => ({ ...prev, name: value }));
    setStoredName(value);
  }

  function setCode(value: string) {
    setSession((prev) => ({ ...prev, code: value }));
    setStoredCode(value);
  }

  function clear() {
    setSession({ name: "", code: "", hydrated: true });
    clearSession();
  }

  return {
    name: session.name,
    code: session.code,
    hydrated: session.hydrated,
    setName,
    setCode,
    clear,
  };
}
