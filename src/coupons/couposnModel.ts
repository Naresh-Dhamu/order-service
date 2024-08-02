import mongoose from "mongoose";
import { Coupons } from "./couposnTyep";

const couponsSchema = new mongoose.Schema<Coupons>(
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
couponsSchema.index({ code: 1, tenantId: 1 }, { unique: true });
export default mongoose.model<Coupons>("Coupons", couponsSchema);
