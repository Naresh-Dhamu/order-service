import { Request, Response } from "express";
import { PaymentGW } from "./paymentTypes";
import orderModel from "../order/orderModel";
import { PaymentStatus } from "../order/orderTypes";

export class PaymentController {
  constructor(private paymentGw: PaymentGW) {}
  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;
    if (webhookBody.type === "checkout.session.completed") {
      const verifiedSession = await this.paymentGw.getSession(
        webhookBody.data.object.id,
      );
      console.log("verifiedSession", verifiedSession);

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";
      const updateOrder = await orderModel.updateOne(
        {
          _id: verifiedSession.metadata.orderId,
        },
        {
          paymentStatus: isPaymentSuccess
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
        },
        {
          new: true,
        },
      );
    }
    return res.json({ success: true });
  };
}
