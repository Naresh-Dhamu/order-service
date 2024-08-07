import { Request, Response } from "express";
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

export class OrderController {
  create = async (req: Request, res: Response) => {
    const isEmpty = validationResult(req).isEmpty();
    if (!isEmpty) {
      return res.status(400).send({ errors: validationResult(req).array() });
    }

    const totalPrice = await this.calculateTotal(req.body.cart);
    let discountPercentage = 0;
    const couponCode = req.body.couponCode;
    const tenantId = req.body.tenantId;
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

    return res.send({ taxes: taxes });
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