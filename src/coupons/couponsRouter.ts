import express from "express";
import { asyncWrapper } from "../utils";
import authenticate from "../common/middleware/authenticate";
import { CouponsController } from "./couponsController";
import { CouponService } from "./couponService";
import logger from "../config/logger";
import couponValidator from "./coupon-validator";
import patchValidator from "./patch-validator";
const router = express.Router();
const couponService = new CouponService();
const couponsController = new CouponsController(couponService, logger);

router.post("/", authenticate, asyncWrapper(couponsController.create));
router.put(
  "/:couponId",
  authenticate,
  couponValidator,
  asyncWrapper(couponsController.updateCoupon),
);
router.patch(
  "/:couponId",
  authenticate,
  patchValidator,
  asyncWrapper(couponsController.updateCoupon),
);
router.post("/verify", authenticate, asyncWrapper(couponsController.verify));
router.get("/", authenticate, asyncWrapper(couponsController.getCoupons));
router.get("/:couponId", authenticate, asyncWrapper(couponsController.getById));
router.delete(
  "/:couponId",
  authenticate,
  asyncWrapper(couponsController.deleteCoupon),
);
export default router;
