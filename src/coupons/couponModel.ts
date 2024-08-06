import mongoose, { AggregatePaginateModel } from "mongoose";
import { Coupons } from "./couposnTyep";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
const couponSchema = new mongoose.Schema<Coupons>(
  {
    title: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    validUpto: {
      type: Date,
      required: true,
    },
    discount: {
      type: Number,
      required: false,
    },
    tenantId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);
couponSchema.index({ code: 1, tenantId: 1 }, { unique: true });
couponSchema.plugin(aggregatePaginate);
export default mongoose.model<Coupons, AggregatePaginateModel<Coupons>>(
  "Coupons",
  couponSchema,
);
