'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface ChatPersonaContextType {
  stamPage: boolean;
  setStamPage: (v: boolean) => void;
}

const ChatPersonaContext = createContext<ChatPersonaContextType>({
  stamPage: false,
  setStamPage: () => {},
});

export function ChatPersonaProvider({ children }: { children: React.ReactNode }) {
  const [stamPage, setStamPageRaw] = useState(false);
  const setStamPage = useCallback((v: boolean) => setStamPageRaw(v), []);
  return (
    <ChatPersonaContext.Provider value={{ stamPage, setStamPage }}>
      {children}
    </ChatPersonaContext.Provider>
  );
}

export function useChatPersona() {
  return useContext(ChatPersonaContext);
}
