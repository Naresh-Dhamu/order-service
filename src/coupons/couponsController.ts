import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { Logger } from "winston";
import { CouponService } from "./couponService";
import { Coupons, Filter } from "./couposnTyep";
import { validationResult } from "express-validator";

export class CouponsController {
  constructor(
    private couponService: CouponService,
    private logger: Logger,
  ) {}
  create = async (req: Request, res: Response) => {
    const { title, code, validUpto, discount, tenantId } = req.body;
    const newCoupon = {
      title,
      code,
      validUpto,
      discount,
      tenantId,
    };
    const coupons = await this.couponService.createCoupon(newCoupon);

    return await res.json(coupons);
  };

  verify = async (req: Request, res: Response, next: NextFunction) => {
    const { code, tenantId } = req.body;
    const coupon = await this.couponService.verifyCoupon(code, tenantId);
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
  getCoupons = async (req: Request, res: Response) => {
    const { q, tenantId } = req.query;
    const filters: Filter = {};
    if (tenantId) {
      filters.tenantId = tenantId as string;
    }
    const coupons = await this.couponService.getAllCoupons(
      q as string,
      filters,
      {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      },
    );
    const couponLength = (coupons.data as Coupons[]).length;

    res.json({
      data: coupons.data,
      pagination: {
        page: coupons.page,
        limit: coupons.limit,
        fached: couponLength,
        pages: coupons.pages,
        total: coupons.total,
        hasNextPage: coupons.hasNextPage,
      },
    });
  };
  getById = async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const coupon = await this.couponService.getCouponById(couponId);
    if (!coupon) {
      const error = createHttpError(404, "Coupon does not exist");
      return res.json(error);
    }
    return res.json(coupon);
  };
  deleteCoupon = async (req: Request, res: Response) => {
    const { couponId } = req.params;
    const coupon = await this.couponService.deleteCouponById(couponId);
    if (!coupon) {
      const error = createHttpError(404, "Coupon does not exist");
      return res.json(error);
    }
    return res.json({
      message: "Coupon deleted successfully",
      id: coupon._id,
    });
  };
  updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return next(createHttpError(400, result.array()[0].msg as string));
    }
    const { couponId } = req.params;
    const { title, code, validUpto, discount, tenantId } = req.body;

    const coupon = await this.couponService.updateCouponById(couponId, {
      title,
      code,
      validUpto,
      discount,
      tenantId,
    });
    if (!coupon) {
      const error = createHttpError(404, "Coupon does not exist");
      return res.json(error);
    }
    return res.json({
      message: "Coupon updated successfully",
      id: coupon._id,
    });
  };
}
