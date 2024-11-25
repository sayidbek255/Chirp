import assert from "node:assert";
import ErrorCode from "../constants/error.code";
import { HttpStatusCode } from "../constants/http";
import AppError from "./app.error";

type AppAssert = (
  condition: any,
  httpStatusCode: HttpStatusCode,
  message: string,
  errorCode?: ErrorCode
) => asserts condition;

const appAssert: AppAssert = (condition, httpStatusCode, message, errorCode) =>
  assert(condition, new AppError(httpStatusCode, message, errorCode));

export default appAssert;
