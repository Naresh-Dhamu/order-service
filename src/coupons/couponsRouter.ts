import express from "express";
import { asyncWrapper } from "../utils";
import authenticate from "../common/middleware/authenticate";
import { CouponsController } from "./couponsController";
const router = express.Router();
const couponsController = new CouponsController();

router.post("/", authenticate, asyncWrapper(couponsController.create));
router.post("/verify", authenticate, asyncWrapper(couponsController.verify));
export default router;
