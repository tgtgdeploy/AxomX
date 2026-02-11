import { createThirdwebClient } from "thirdweb";

let _client: ReturnType<typeof createThirdwebClient> | null = null;

export async function getThirdwebClient() {
  if (_client) return _client;
  const res = await fetch("/api/config");
  const data = await res.json();
  _client = createThirdwebClient({ clientId: data.thirdwebClientId });
  return _client;
}

export function createStaticClient(clientId: string) {
  _client = createThirdwebClient({ clientId });
  return _client;
}
