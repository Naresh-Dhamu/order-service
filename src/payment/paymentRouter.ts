import express from "express";
import { PaymentController } from "./paymentController";
import { asyncWrapper } from "../utils";
import { StripeGW } from "./stripe";
import { createMessageBroker } from "../common/factories/brockerFactory";
const router = express.Router();
const paymentGw = new StripeGW();
const broker = createMessageBroker();
const paymentController = new PaymentController(paymentGw, broker);
router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
