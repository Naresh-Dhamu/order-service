import express from "express";
import { asyncWrapper } from "../utils";
import { OrderController } from "./orderController";
import authenticate from "../common/middleware/authenticate";
const router = express.Router();
const orderController = new OrderController();

router.get("/", asyncWrapper(orderController.get));
router.post("/", authenticate, asyncWrapper(orderController.create));
export default router;
