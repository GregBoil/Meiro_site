export interface ContactMessage {
  name: string;
  contact: string;
  subject: string;
  message: string;
}

// Connect a same-origin backend endpoint when the delivery provider is configured.
// Never report success without a confirmed backend response.
export async function sendContactMessage(
  message: ContactMessage,
): Promise<void> {
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT;
  if (!endpoint) throw new Error("not-configured");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("delivery-failed");
}
