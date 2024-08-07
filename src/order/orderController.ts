import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  CartItem,
  ProductPricingCache,
  Topping,
  ToppingPricingCache,
} from "../types";
import productCacheModel from "../productCache/productCacheModel";
import toppingCacheModel from "../toppingCache/toppingCacheModel";
import couponModel from "../coupons/couponModel";
import orderModel from "./orderModel";
import { OrderStatus, PaymentMode, PaymentStatus } from "./orderTypes";
import idempotencyModel from "../idempotency/idempotencyModel";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import { PaymentGW } from "../payment/paymentTypes";

export class OrderController {
  constructor(private paymentGw: PaymentGW) {}
  create = async (req: Request, res: Response, next: NextFunction) => {
    console.log("dsfjhdgfdsjhg", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }
    const {
      cart,
      couponCode,
      tenantId,
      address,
      paymentMode,
      customerId,
      comment,
    } = req.body;
    const totalPrice = await this.calculateTotal(cart);
    let discountPercentage = 0;
    if (couponCode) {
      discountPercentage = await this.getDiscountPercentage(
        couponCode,
        tenantId,
      );
    }
    const discountAmount = Math.round(totalPrice * (discountPercentage / 100));
    const priceAfterDiscount = totalPrice - discountAmount;
    const TATEX_PERCENT = 18;
    const taxes = Math.round((priceAfterDiscount * TATEX_PERCENT) / 100);
    const DELEVERY_CHARGE = 50;
    const finalTotal = priceAfterDiscount + taxes + DELEVERY_CHARGE;
    const idempotencyKey = req.headers["idempotency-key"];
    console.log("idempotencyKey", idempotencyKey);
    const idempotency = await idempotencyModel.findOne({ key: idempotencyKey });

    console.log("idempotency", idempotency);
    let newOrder = idempotency ? [idempotency.response] : [];
    if (!idempotency) {
      const session = await mongoose.startSession();
      await session.startTransaction();
      try {
        newOrder = await orderModel.create(
          [
            {
              cart,
              address,
              comment,
              customerId,
              deliveryCharge: DELEVERY_CHARGE,
              discount: discountAmount,
              taxes,
              tenantId,
              total: finalTotal,
              paymentMode,
              orderStatus: OrderStatus.PECEIVED,
              paymentStatus: PaymentStatus.PENDING,
            },
          ],
          { session },
        );
        await idempotencyModel.create([
          {
            key: idempotencyKey,
            response: newOrder[0],
          },
        ]),
          await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        await session.endSession();

        return next(createHttpError(500, err.message));
      } finally {
        await session.endSession();
      }
    }
    if (paymentMode === PaymentMode.CARD) {
      const session = await this.paymentGw.createSession({
        amount: finalTotal,
        orderId: newOrder[0]._id.toString(),
        tenantId: tenantId,
        currency: "inr",
        idempotentKey: idempotencyKey as string,
      });

      return res.send({ paymentUrl: session.paymentUrl });
    }
    return res.json({ paymentUrl: null });
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);
    const productPricings = await productCacheModel.find({
      productId: {
        $in: productIds,
      },
    });
    const cartToppingIds = cart.reduce((acc, item) => {
      return [
        ...acc,
        ...item.chosenConfiguration.selectedToppings.map(
          (topping) => topping._id,
        ),
      ];
    }, []);

    const toppingPricings = await toppingCacheModel.find({
      toppingId: {
        $in: cartToppingIds,
      },
    });

    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId === curr._id,
      );
      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);

    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductPricingCache | undefined,
    toppingPricing: ToppingPricingCache[],
  ) => {
    // Calculate the total price of selected toppings
    const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
      (acc, curr) => {
        return acc + this.getCurrentToppingPrice(curr, toppingPricing);
      },
      0,
    );

    // Ensure cachedProductPrice is defined before accessing priceConfiguration
    if (!cachedProductPrice || !cachedProductPrice.priceConfiguration) {
      console.error(
        `No pricing information found for product with ID ${item._id}`,
      );
      return toppingsTotal;
    }

    const productTotal = Object.entries(
      item.chosenConfiguration.priceConfiguration,
    ).reduce((acc, [key, value]) => {
      const price =
        cachedProductPrice.priceConfiguration[key].availableOptions[value];
      return acc + price;
    }, 0);

    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricings: ToppingPricingCache[],
  ) => {
    const currentTopping = toppingPricings.find(
      (current) => topping._id === current.toppingId,
    );
    if (!currentTopping) {
      return topping.price;
    }
    return currentTopping.price;
  };
  private getDiscountPercentage = async (
    couponCode: string,
    tenantId: string,
  ) => {
    const code = await couponModel.findOne({
      code: couponCode,
      tenantId,
    });
    if (!code) {
      return 0;
    }
    const currentDate = new Date();
    const couponDate = new Date(code.validUpto);
    if (currentDate <= couponDate) {
      return code.discount;
    }
    return 0;
  };

  get = async (req: Request, res: Response) => {
    return res.send({});
  };
}

// import { Request, Response } from "express";
// import { validationResult } from "express-validator";
// import {
//   CartItem,
//   ProductPricingCache,
//   Topping,
//   ToppingPricingCache,
// } from "../types";
// import productCacheModel from "../productCache/productCacheModel";
// import toppingCacheModel from "../toppingCache/toppingCacheModel";

// export class OrderController {
//   create = async (req: Request, res: Response) => {
//     const isEmpty = validationResult(req).isEmpty();
//     if (!isEmpty) {
//       return res.status(400).send({ errors: validationResult(req).array() });
//     }
//     const totalPrice = await this.calculateTotal(req.body.cart);
//     return res.send({ totalPrice: totalPrice });
//   };
//   private calculateTotal = async (cart: CartItem[]) => {
//     const productIds = cart.map((item) => item._id);
//     const productPricings = await productCacheModel.find({
//       productId: {
//         $in: productIds,
//       },
//     });
//     const cartToppingIds = cart.reduce((acc, item) => {
//       return [
//         ...acc,
//         ...item.chosenConfiguration.selectedToppings.map(
//           (topping) => topping._id,
//         ),
//       ];
//     }, []);

//     const toppingPricings = await toppingCacheModel.find({
//       toppingId: {
//         $in: cartToppingIds,
//       },
//     });

//     const totalPrice = cart.reduce((acc, curr) => {
//       const cachedProductPrice = productPricings.find(
//         (product) => product.productId === curr._id,
//       );
//       return (
//         acc +
//         curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
//       );
//     }, 0);

//     return totalPrice;
//   };

//   private getItemTotal = (
//     item: CartItem,
//     cachedProductPrice: ProductPricingCache,
//     toppingPricing: ToppingPricingCache[],
//   ) => {
//     const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
//       (acc, curr) => {
//         return acc + this.getCurrentToppingPrice(curr, toppingPricing);
//       },
//       0,
//     );
//     const productTotal = Object.entries(
//       item.chosenConfiguration.priceConfiguration,
//     ).reduce((acc, [key, value]) => {
//       const price =
//         cachedProductPrice.priceConfiguration[key].availableOptions[value];
//       return acc + price;
//     }, 0);
//     return productTotal + toppingsTotal;
//   };

//   private getCurrentToppingPrice = (
//     topping: Topping,
//     toppingPricings: ToppingPricingCache[],
//   ) => {
//     const currentTopping = toppingPricings.find(
//       (current) => topping._id === current.toppingId,
//     );
//     if (!currentTopping) {
//       return topping.price;
//     }
//     return currentTopping.price;
//   };
//   get = async (req: Request, res: Response) => {
//     return res.send({});
//   };
// }
