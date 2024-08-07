import Stripe from "stripe";
import { PaymentGW, PaymentOptions } from "./paymentTypes";
import config from "config";
export class StripeGW implements PaymentGW {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(config.get("stripe.secretKey"));
  }
  async createSession(options: PaymentOptions) {
    const session = await this.stripe.checkout.sessions.create(
      {
        metadata: {
          orderId: options.orderId,
        },
        line_items: [
          {
            price_data: {
              unit_amount: options.amount * 100,
              product_data: {
                name: "Online Pizza Order",
                description: "Total amount to be paid",
                images: ["https://i.imgur.com/cE5p8B0.png"],
              },
              currency: options.currency || "inr",
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${config.get("frontend.clientUrl")}/payment?sucess=true&orderId=${options.orderId}`,
        cancel_url: `${config.get("frontend.clientUrl")}/payment?sucess=false&orderId=${options.orderId}`,
      },
      {
        idempotencyKey: options.idempotentKey,
      },
    );
    return {
      id: session.id,
      paymentUrl: session.url,
      paymentStatus: session.payment_status,
    };
  }
  async getSession() {
    return null;
  }
}
