import { Response } from "express";
import { Request } from "express-jwt";
import customerModel from "./customerModel";
import logger from "../config/logger";

export class CustomerController {
  getCustomer = async (req: Request, res: Response) => {
    const { _id: userId, firstName, lastName, email } = req.auth;
    const customer = await customerModel.findOne({ userId });
    if (!customer) {
      const newCutomer = await customerModel.create({
        userId,
        firstName,
        lastName,
        email,
        addresses: [],
      });
      logger.info("New customer created");
      return res.json(newCutomer);
    }

    res.json(customer);
  };
  addAddress = async (req: Request, res: Response) => {
    const { _id: userId } = req.auth;
    const customer = await customerModel.findByIdAndUpdate(
      {
        _id: req.params.id,
        userId,
      },
      {
        $push: {
          addresses: {
            text: req.body.address,
            isDefault: false,
          },
        },
      },
      {
        new: true,
      },
    );
    return res.json(customer);
  };
}
