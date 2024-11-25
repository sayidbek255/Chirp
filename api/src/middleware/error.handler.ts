import { ErrorRequestHandler, Response } from "express";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../constants/http";
import { ZodError } from "zod";
import AppError from "../utils/app.error";
import { clearAuthCookies, REFRESH_PATH } from "../utils/cookies";

const handleZodError = (res: Response, err: ZodError) => {
  const errors = err.issues.map((e) => ({
    path: e.path.join("."),
    message: e.message,
  }));

  res.status(BAD_REQUEST).json({
    message: err.message,
    errors,
  });
};

const handleAppError = (res: Response, err: AppError) => {
  res.status(err.statusCode).json({
    message: err.message,
    errorCode: err.errorCode,
  });
};

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`PATH: ${req.path})`, err);

  if (req.path === REFRESH_PATH) {
    clearAuthCookies(res);
  }

  if (err instanceof ZodError) {
    return handleZodError(res, err);
  }

  if (err instanceof AppError) {
    return handleAppError(res, err);
  }

  res.status(INTERNAL_SERVER_ERROR).send("Internal Server Error");
};

export default errorHandler;
