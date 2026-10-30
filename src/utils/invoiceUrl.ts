// Utility for generating and opening invoice URLs in a new browser tab

export function getInvoiceUrl(invoiceId: string, type: 'sales' | 'purchase' = 'sales'): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?view_invoice=${encodeURIComponent(invoiceId)}&type=${type}`;
}

export function openInvoiceInNewTab(invoiceId: string, type: 'sales' | 'purchase' = 'sales'): Window | null {
  if (typeof window === 'undefined') return null;
  const url = getInvoiceUrl(invoiceId, type);
  try {
    return window.open(url, '_blank');
  } catch (err) {
    console.error('Error opening invoice in new tab:', err);
    return null;
  }
}
