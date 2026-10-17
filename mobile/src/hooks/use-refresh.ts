import { useState } from "react";

type Refetchable = { refetch: () => Promise<unknown> };

export function useRefresh(...queries: Refetchable[]) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(queries.map((query) => query.refetch()));
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}
