export interface Coupons {
  title: string;
  code: string;
  validUpto: Date;
  discount: number;
  tenantId: string;
}

export interface Filter {
  tenantId?: string;
}
