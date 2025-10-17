export function encodeForWhatsApp(msg: string): string {
  return encodeURIComponent(msg).replace(/%20/g, '+');
}

export function waDeeplink(text: string): string {
  return `https://wa.me/?text=${encodeForWhatsApp(text)}`;
}

export async function shareOrOpen(text: string): Promise<{ method: 'web-share' | 'deeplink' }> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: 'web-share' };
    } catch {
      // Fall through to deeplink
    }
  }
  
  window.open(waDeeplink(text), '_blank', 'noopener,noreferrer');
  return { method: 'deeplink' };
}
