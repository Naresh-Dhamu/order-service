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

router.get("/mine", authenticate, asyncWrapper(orderController.getMine));
router.get("/:orderId", authenticate, asyncWrapper(orderController.getById));
router.post("/", authenticate, asyncWrapper(orderController.create));
router.get("/", authenticate, asyncWrapper(orderController.getAll));
export default router;
