import { Request, Response } from "express";

export class OrderController {
  create = async (req: Request, res: Response) => {
    return res.send({ success: true });
  };
  get = async (req: Request, res: Response) => {
    return res.send({});
  };
}
