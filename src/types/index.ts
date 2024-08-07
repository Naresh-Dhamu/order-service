import { Request } from "express";

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
  toppingId: string;
  price: number;
}

export interface ProductMessage {
  id: string;
  priceConfiguration: PriceConfiguration;
}
export interface ToppingMessage {
  id: string;
  price: number;
}
