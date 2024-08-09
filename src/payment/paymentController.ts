import { Request, Response } from "express";
import { PaymentGW } from "./paymentTypes";
import orderModel from "../order/orderModel";
import { OrderEvents, PaymentStatus } from "../order/orderTypes";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/customerModel";

export class PaymentController {
  constructor(
    private paymentGw: PaymentGW,
    private broker: MessageBroker,
  ) {}
  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;
    if (webhookBody.type === "checkout.session.completed") {
      const verifiedSession = await this.paymentGw.getSession(
        webhookBody.data.object.id,
      );

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";
      const updateOrder = await orderModel.findOneAndUpdate(
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
      const customer = await customerModel.findOne({
        _id: updateOrder.customerId,
      });
      const brokerMessage = {
        event_type: OrderEvents.PAYMENT_STATUS_UPDATED,
        data: {
          ...updateOrder.toObject(),
          customerId: customer,
        },
      };
      await this.broker.sendMessage(
        "order",
        JSON.stringify(brokerMessage),
        updateOrder._id.toString(),
      );
    }
    return res.json({ success: true });
  };
}
