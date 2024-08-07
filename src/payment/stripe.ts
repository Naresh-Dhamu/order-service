import Stripe from "stripe";
import {
  CustomMetadata,
  PaymentGW,
  PaymentOptions,
  VerifiedSession,
} from "./paymentTypes";
import config from "config";
export class StripeGW implements PaymentGW {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(config.get("stripe.secretKey"));
  }
  async createSession(options: PaymentOptions) {
    const session = await this.stripe.checkout.sessions.create(
      {
        // customer_email: options.email,
        metadata: {
          orderId: options.orderId,
        },
        billing_address_collection: "required",
        // payment_intent_data: {
        //   shipping: {
        //     name: "Naresh Dhamu",
        //     address: {
        //       line1: "some line",
        //       city: "Mumbai",
        //       country: "India",
        //       postal_code: "400054",
        //     },
        //   },
        // },
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
        success_url: `${config.get("frontend.clientUrl")}/payment?success=true&orderId=${options.orderId}`,
        cancel_url: `${config.get("frontend.clientUrl")}/payment?success=false&orderId=${options.orderId}`,
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
  async getSession(id: string) {
    const session = await this.stripe.checkout.sessions.retrieve(id);
    const verifiedSession: VerifiedSession = {
      id: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata as unknown as CustomMetadata,
    };
    return verifiedSession;
  }
}
