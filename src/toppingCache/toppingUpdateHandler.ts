import { ToppingMessage } from "../types";
import toppingCacheModel from "./toppingCacheModel";

export const handleToppingUpdate = async (value: string) => {
  const topping: ToppingMessage = JSON.parse(value);
  return await toppingCacheModel.updateOne(
    {
      toppingId: topping.data._id,
    },
    {
      $set: {
        price: topping.data.price,
        tenantId: topping.data.tenantId,
      },
    },
    {
      upsert: true,
    },
  );
};
