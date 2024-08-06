import { paginationLabel } from "../config/pagination";
import { paginateQuery } from "../types";
import couponModel from "./couponModel";
import { Coupons, Filter } from "./couposnTyep";

export class CouponService {
  async createCoupon(coupon: Coupons) {
    return await couponModel.create(coupon);
  }
  async getAllCoupons(
    q: string,
    filters: Filter,
    paginateQuery: paginateQuery,
  ) {
    const searchQueryRegex = new RegExp(q, "i");
    const matchQuery = {
      ...filters,
      title: searchQueryRegex,
    };
    // const searchQueryRegex = q ? new RegExp(q, "i") : null;
    // const matchQuery = searchQueryRegex
    //   ? { ...filters, name: searchQueryRegex }
    //   : {};

    const aggregate = couponModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $unwind: "$tenantId",
      },
    ]);

    return await couponModel.aggregatePaginate(aggregate, {
      ...paginateQuery,
      customLabels: paginationLabel,
    });
  }

  async verifyCoupon(code: string, tenantId: string) {
    return await couponModel.findOne({ code, tenantId });
  }
  async getCouponById(couponId: string) {
    return await couponModel.findById(couponId);
  }

  async deleteCouponById(couponId: string) {
    return await couponModel.findByIdAndDelete(couponId);
  }
  async updateCouponById(couponId: string, coupon: Coupons) {
    return await couponModel.findByIdAndUpdate(couponId, coupon);
  }
}
