// Prepared domain contracts. No checkout, invoice, or payment is simulated.
export interface CartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface CheckoutRequest {
  items: CartItem[];
  customer: { name: string; phone: string; email?: string };
  shippingAddress: string;
}

export interface PaymentInvoice {
  orderId: string;
  invoiceId: string;
  qrImage: string;
  paymentLinks: { name: string; url: string }[];
  expiresAt: string;
}

export interface CheckoutService {
  // The server must validate stock and compute prices from trusted product data.
  createInvoice(request: CheckoutRequest): Promise<PaymentInvoice>;
  getPaymentStatus(orderId: string): Promise<"pending" | "paid" | "expired">;
}
