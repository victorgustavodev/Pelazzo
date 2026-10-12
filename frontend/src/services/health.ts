const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
);

export async function checkReadiness(signal: AbortSignal): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/health/ready`, { signal });
  if (!response.ok) throw new Error('Serviço indisponível');
  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('status' in result) ||
    result.status !== 'ok'
  ) {
    throw new Error('Resposta inesperada');
  }
}
