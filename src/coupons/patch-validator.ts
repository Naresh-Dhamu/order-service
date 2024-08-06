import { body } from "express-validator";

export default [
  body("title").optional().isString().withMessage("Title must be a string"),

  body("code").optional().isString().withMessage("Code must be a string"),

  body("validUpto")
    .optional()
    .isISO8601()
    .withMessage("ValidUpto must be a valid date in ISO 8601 format")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("ValidUpto must be a future date");
      }
      return true;
    }),

  body("discount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Discount must be a positive number"),

  body("tenantId")
    .optional()
    .isString()
    .withMessage("TenantId must be a string"),
];
