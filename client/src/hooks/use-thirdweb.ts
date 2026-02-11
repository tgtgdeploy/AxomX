import { useState, useEffect } from "react";
import { createThirdwebClient } from "thirdweb";

let cachedClient: ReturnType<typeof createThirdwebClient> | null = null;

export function useThirdwebClient() {
  const [client, setClient] = useState<ReturnType<typeof createThirdwebClient> | null>(cachedClient);
  const [isLoading, setIsLoading] = useState(!cachedClient);

  useEffect(() => {
    if (cachedClient) {
      setClient(cachedClient);
      setIsLoading(false);
      return;
    }

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        const c = createThirdwebClient({ clientId: data.thirdwebClientId });
        cachedClient = c;
        setClient(c);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return { client, isLoading };
}
