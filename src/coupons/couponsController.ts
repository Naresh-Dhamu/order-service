import { NextFunction, Request, Response } from "express";
import couponsModel from "./couposnModel";
import createHttpError from "http-errors";

export class CouponsController {
  create = async (req: Request, res: Response) => {
    const { title, code, validUpto, discount, tenantId } = req.body;
    const newCoupon = {
      title,
      code,
      validUpto,
      discount,
      tenantId,
    };
    const coupons = await couponsModel.create(newCoupon);

    return await res.json(coupons);
  };

  verify = async (req: Request, res: Response, next: NextFunction) => {
    const { code, tenantId } = req.body;
    const coupon = await couponsModel.findOne({ code, tenantId });
    if (!coupon) {
      const error = createHttpError(404, "Coupon does not exist");
      return next(error);
    }
    const currentDate = new Date();
    const couponDate = new Date(coupon.validUpto);
    if (currentDate <= couponDate) {
      return res.json({ valid: true, discount: coupon.discount });
    }
    return res.json({ valid: false, discount: 0 });
  };
}
