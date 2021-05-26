import { Request, Response, NextFunction } from "express";

const formatEntityId = () => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.params.entityId !== undefined) {
      if (!req.params.entityId.startsWith("dcd:things:")) {
        req.params.entityId = `dcd:things:${req.params.entityId}`;
      }
    }
    next();
  };
};

export default formatEntityId;
