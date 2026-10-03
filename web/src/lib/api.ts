import { useStore } from "./store";

// Única puerta al backend: todas las rutas viven bajo /api.
// Con `example` (contrato en app/fixtures/api/), un fallo devuelve el ejemplo y activa "Sample case".
export async function api<T>(path: string, init?: RequestInit, example?: T): Promise<T> {
  try {
    const response = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return (await response.json()) as T;
  } catch (error) {
    if (example === undefined) throw error;
    useStore.getState().setSampleMode(true);
    return example;
  }
}
