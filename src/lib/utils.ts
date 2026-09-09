export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD-${ymd}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `INV-${ymd}-${rand}`;
}

export function generatePurchaseNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `PUR-${ymd}-${rand}`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  preparing: 'bg-blue-100 text-blue-700 border-blue-200',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  served: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  issued: 'Issued',
  paid: 'Paid',
  voided: 'Voided',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  issued: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  voided: 'bg-red-100 text-red-700 border-red-200',
};

export const LEDGER_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Purchase',
  ORDER_ISSUE: 'Order Issue',
  ORDER_RETURN: 'Order Return',
  ADJUSTMENT: 'Adjustment',
};

export const LEDGER_TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'text-emerald-600',
  ORDER_ISSUE: 'text-red-600',
  ORDER_RETURN: 'text-blue-600',
  ADJUSTMENT: 'text-amber-600',
};
