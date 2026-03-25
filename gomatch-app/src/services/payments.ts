import api from "./api";

export interface PaymentIntent {
  client_secret: string;
  amount: number;
  payment_id: string;
}

export interface Payment {
  id: string;
  booking: string;
  payer: string;
  amount: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_method: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export const paymentsService = {
  async createPaymentIntent(bookingId: string): Promise<PaymentIntent> {
    const { data } = await api.post<PaymentIntent>("/payments/create-intent/", {
      booking_id: bookingId,
    });
    return data;
  },

  async getMyPayments(): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>("/payments/my/");
    return data;
  },
};
