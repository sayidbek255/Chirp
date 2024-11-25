import ErrorCode from "../constants/error.code";
import { HttpStatusCode } from "../constants/http";

class AppError extends Error {
  constructor(
    public statusCode: HttpStatusCode,
    public message: string,
    public errorCode?: ErrorCode
  ) {
    super(message);
  }
}

export default AppError;
