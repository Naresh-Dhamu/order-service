import { NextFunction, Request, Response } from "express";
import { Request as AuthRequest } from "express-jwt";
import { validationResult } from "express-validator";
import {
  CartItem,
  ProductPricingCache,
  ROLES,
  Topping,
  ToppingPricingCache,
} from "../types";
import productCacheModel from "../productCache/productCacheModel";
import toppingCacheModel from "../toppingCache/toppingCacheModel";
import couponModel from "../coupons/couponModel";
import orderModel from "./orderModel";
import {
  OrderEvents,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
} from "./orderTypes";
import idempotencyModel from "../idempotency/idempotencyModel";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import { PaymentGW } from "../payment/paymentTypes";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/customerModel";

export class OrderController {
  constructor(
    private paymentGw: PaymentGW,
    private broker: MessageBroker,
  ) {}
  create = async (req: Request, res: Response, next: NextFunction) => {
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

    const idempotency = await idempotencyModel.findOne({ key: idempotencyKey });

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
    const customer = await customerModel.findOne({
      _id: newOrder[0].customerId,
    });
    const brokerMessage = {
      event_type: OrderEvents.ORDER_CREATED,
      data: {
        ...newOrder[0],
        customerId: customer,
      },
    };
    if (paymentMode === PaymentMode.CARD) {
      const session = await this.paymentGw.createSession({
        amount: finalTotal,
        orderId: newOrder[0]._id.toString(),
        tenantId: tenantId,
        currency: "inr",
        idempotentKey: idempotencyKey as string,
      });

      await this.broker.sendMessage(
        "order",
        JSON.stringify(brokerMessage),
        newOrder[0]._id.toString(),
      );
      return res.send({ paymentUrl: session.paymentUrl });
    }

    await this.broker.sendMessage(
      "order",
      JSON.stringify(brokerMessage),
      newOrder[0]._id.toString(),
    );

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

  getMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.auth._id;
    if (!userId) {
      return next(createHttpError(400, "User not found"));
    }
    const customer = await customerModel.findOne({ userId });
    if (!customer) {
      return next(createHttpError(400, "No customer found"));
    }
    const orders = await orderModel.find(
      { customerId: customer._id },
      { cart: 0 },
    );
    return res.json(orders);
  };
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const orderId = req.params.orderId;
    const { _id: userId, role, tenant: tenantId } = req.auth;

    const fields = req.query.fields
      ? req.query.fields.toString().split(",")
      : [];
    const projection = fields.reduce(
      (acc, field) => {
        acc[field] = 1;

        return acc;
      },
      { customerId: 1, tenantId: 1 },
    );
    const order = await orderModel
      .findOne({ _id: orderId }, projection)
      .populate("customerId")
      .exec();
    if (!order) {
      return next(createHttpError(400, "Order does not exist."));
    }
    if (role === "admin") {
      return res.json(order);
    }
    const myRestaurantOrder = order.tenantId === tenantId;
    if (role === "manager" && myRestaurantOrder) {
      return res.json(order);
    }
    if (role === "customer") {
      const customer = await customerModel.findOne({ userId });
      if (!customer) {
        return next(createHttpError(400, "No customer found"));
      }
      if (order.customerId._id.toString() === customer._id.toString()) {
        return res.json(order);
      }
    }
    return next(createHttpError(403, "Operation not permitted"));
  };
  getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { role, tenant: userTenantId } = req.auth;
    const tenantId = req.query.tenantId;
    if (role === ROLES.CUSTOMER) {
      return next(createHttpError(403, "Not allowed"));
    }
    if (role === ROLES.ADMIN) {
      const filter = {};
      if (tenantId) {
        filter["tenantId"] = tenantId;
      }
      const orders = await orderModel
        .find(filter, {}, { sort: { createdAt: -1 } })
        .populate("customerId")
        .exec();

      return res.json(orders);
    }
    if (role === ROLES.MANAGER) {
      const orders = await orderModel
        .find({ tenantId: userTenantId }, {}, { sort: { createdAt: -1 } })
        .populate("customerId")
        .exec();
      return res.json(orders);
    }
    return next(createHttpError(403, "Not allowed"));
  };
  changeStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const { role, tenant: tenantId } = req.auth;
    const orderId = req.params.orderId;
    if (role === ROLES.MANAGER || ROLES.ADMIN) {
      const order = await orderModel.findOne({ _id: orderId });
      if (!order) {
        return next(createHttpError(400, "Order does not exist."));
      }
      const isMyRestaurantOrder = order.tenantId === tenantId;
      if (role === ROLES.MANAGER && !isMyRestaurantOrder) {
        return next(createHttpError(403, "Operation not permitted"));
      }
      const updateOrder = await orderModel.findOneAndUpdate(
        { _id: orderId },
        { orderStatus: req.body.status },
        { new: true },
      );
      const customer = await customerModel.findOne({
        _id: updateOrder.customerId,
      });
      const brokerMessage = {
        event_type: OrderEvents.ORDER_STATUS_UPDATED,
        data: {
          ...updateOrder.toObject(),
          customerId: customer,
        },
      };
      await this.broker.sendMessage(
        "order",
        JSON.stringify(brokerMessage),
        updateOrder._id.toString(),
      );
      return res.json({ _id: updateOrder._id });
    }
    return next(createHttpError(403, "Not allowed"));
  };
}
