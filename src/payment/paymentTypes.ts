export interface PaymentOptions {
  currency?: "inr";
  amount: number;
  orderId: string;
  tenantId: string;
  idempotentKey?: string;
}
type GetewayPaymentStatus = "no_payment_required" | "paid" | "unpaid";
interface PaymentSession {
  id: string;
  paymentUrl: string;
  paymentStatus: GetewayPaymentStatus;
}

export interface CustomMetadata {
  orderId: string;
}
export interface VerifiedSession {
  id: string;
  metadata: CustomMetadata;
  paymentStatus: GetewayPaymentStatus;
}

export interface PaymentGW {
  createSession: (options: PaymentOptions) => Promise<PaymentSession>;
  getSession: (sessionId: string) => Promise<VerifiedSession>;
}
