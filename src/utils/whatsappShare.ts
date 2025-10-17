export function encodeForWhatsApp(msg: string): string {
  return encodeURIComponent(msg).replace(/%20/g, '+');
}

export function waDeeplink(text: string): string {
  return `https://wa.me/?text=${encodeForWhatsApp(text)}`;
}

export async function shareOrOpen(text: string): Promise<{ method: 'web-share' | 'deeplink' }> {
  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: 'web-share' };
    } catch (error) {
      // User cancelled or not supported, fall through to deeplink
      console.log('Web Share cancelled or failed:', error);
    }
  }
  
  // Fallback to WhatsApp deeplink
  window.open(waDeeplink(text), '_blank', 'noopener,noreferrer');
  return { method: 'deeplink' };
}
