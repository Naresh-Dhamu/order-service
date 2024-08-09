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

export enum ProductEvents {
  PRODUCT_CREATED = "PRODUCT_CREATED",
  PRODUCT_UPDATED = "PRODUCT_UPDATED",
  PRODUCT_DELETED = "PRODUCT_DELETED",
}

export interface ProductMessage {
  event_type: ProductEvents;
  data: {
    id: string;
    priceConfiguration: PriceConfiguration;
  };
}

export enum ToppingEvents {
  TOPPING_CREATED = "TOPPING_CREATED",
  TOPPING_UPDATED = "TOPPING_UPDATED",
  TOPPING_DELETED = "TOPPING_DELETED",
}

export interface ToppingMessage {
  event_type: ToppingEvents;
  data: {
    _id: string;
    price: string;
    tenantId: string;
  };
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

export enum ROLES {
  ADMIN = "admin",
  CUSTOMER = "customer",
  MANAGER = "manager",
}
