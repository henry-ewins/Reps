import type { ProcessingResult } from '../types';

export async function processReference(reference: string): Promise<ProcessingResult> {
  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Server error: ${response.status}`);
  }

  return response.json();
}
