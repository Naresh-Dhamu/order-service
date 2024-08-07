import { Request } from "express";
import mongoose from "mongoose";

export type AuthCookie = {
  accessToken: string;
};

export interface AuthRequest extends Request {
  auth: {
    sub: string;
    role: string;
    id?: string;
    tenant: string;
  };
}

export interface paginateQuery {
  page: number;
  limit: number;
}

export interface PriceConfiguration {
  priceType: "base" | "aditional";
  availableOptions: {
    [key: string]: number;
  };
}

export interface ProductPricingCache {
  productId: string;
  priceConfiguration: PriceConfiguration;
}
export interface ToppingPricingCache {
  _id: mongoose.Types.ObjectId;
  toppingId: string;
  price: number;
}

export interface ProductMessage {
  id: string;
  priceConfiguration: PriceConfiguration;
}
export interface ToppingMessage {
  _id: string;
  price: number;
}

export type ProductPriceConfiguration = {
  [key: string]: {
    priceType: "base" | "aditional";
    availableOptions: {
      [key: string]: number;
    };
  };
};
export type Product = {
  _id: string;
  name: string;
  image: string;
  description: string;
  priceConfiguration: ProductPriceConfiguration;
};
export type Topping = {
  _id: string;
  name: string;
  image: string;
  price: number;
};
export interface CartItem
  extends Pick<Product, "_id" | "name" | "image" | "priceConfiguration"> {
  chosenConfiguration: {
    priceConfiguration: {
      [key: string]: string;
    };
    selectedToppings: Topping[];
  };
  qty: number;
}
