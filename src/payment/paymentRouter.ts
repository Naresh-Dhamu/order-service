import express from "express";
import { PaymentController } from "./paymentController";
import { asyncWrapper } from "../utils";
import { StripeGW } from "./stripe";
const router = express.Router();
const paymentGw = new StripeGW();
const paymentController = new PaymentController(paymentGw);
router.post("/webhook", asyncWrapper(paymentController.handleWebhook));

export default router;
