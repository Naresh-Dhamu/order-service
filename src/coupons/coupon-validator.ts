import { body } from "express-validator";

export default [
  body("title").isString().withMessage("Title must be a string"),

  body("code").isString().withMessage("Code must be a string"),

  body("validUpto")
    .isISO8601()
    .withMessage("ValidUpto must be a valid date in ISO 8601 format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("ValidUpto must be a future date");
      }
      return true;
    }),

  body("discount")
    .isFloat({ gt: 0 })
    .withMessage("Discount must be a positive number"),

  body("tenantId").isString().withMessage("TenantId must be a string"),
];
