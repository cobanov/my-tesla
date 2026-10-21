import * as SecureStore from "expo-secure-store";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { parseConnection, type Connection } from "./server";

const storageKey = "connection";

type ConnectionState = {
  loaded: boolean;
  connection: Connection | null;
  save: (connection: Connection) => Promise<void>;
  forget: () => Promise<void>;
};

const ConnectionContext = createContext<ConnectionState | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(storageKey)
      .then((stored) => setConnection(parseConnection(stored)))
      .catch(() => setConnection(null))
      .finally(() => setLoaded(true));
  }, []);

  const save = async (next: Connection) => {
    await SecureStore.setItemAsync(storageKey, JSON.stringify(next), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    setConnection(next);
  };

  const forget = async () => {
    await SecureStore.deleteItemAsync(storageKey);
    setConnection(null);
  };

  return (
    <ConnectionContext value={{ loaded, connection, save, forget }}>
      {children}
    </ConnectionContext>
  );
}

export function useConnectionState(): ConnectionState {
  const state = use(ConnectionContext);
  if (!state) throw new Error("Wrap the app in ConnectionProvider.");
  return state;
}

export function useConnection(): Connection {
  const { connection } = useConnectionState();
  if (!connection) throw new Error("Connect to a server first.");
  return connection;
}
