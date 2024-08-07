import express from "express";
import { asyncWrapper } from "../utils";
import { OrderController } from "./orderController";
import authenticate from "../common/middleware/authenticate";
import { StripeGW } from "../payment/stripe";
import { createMessageBroker } from "../common/factories/brockerFactory";
const router = express.Router();
const paymentGw = new StripeGW();
const broker = createMessageBroker();
const orderController = new OrderController(paymentGw, broker);

router.get("/", asyncWrapper(orderController.get));
router.post("/", authenticate, asyncWrapper(orderController.create));
export default router;
