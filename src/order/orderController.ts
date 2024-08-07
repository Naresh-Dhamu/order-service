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

export class OrderController {
  create = async (req: Request, res: Response) => {
    const isEmpty = validationResult(req).isEmpty();
    if (!isEmpty) {
      return res.status(400).send({ errors: validationResult(req).array() });
    }
    const totalPrice = await this.calculateTotal(req.body.cart);
    return res.send({ totalPrice: totalPrice });
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
      return toppingsTotal; // Return just the toppings total if no product price is found
    }

    // Calculate the total price based on the price configuration of the product
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
