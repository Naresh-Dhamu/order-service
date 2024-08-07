import express from "express";
import { asyncWrapper } from "../utils";
import { OrderController } from "./orderController";
import authenticate from "../common/middleware/authenticate";
import { StripeGW } from "../payment/stripe";
const router = express.Router();
const paymentGw = new StripeGW();
const orderController = new OrderController(paymentGw);

router.get("/", asyncWrapper(orderController.get));
router.post("/", authenticate, asyncWrapper(orderController.create));
export default router;
