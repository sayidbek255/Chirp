import { RequestHandler } from "express";
import appAssert from "../utils/app.assert";
import { UNAUTHORIZED } from "../constants/http";
import ErrorCode from "../constants/error.code";
import { AccessTokenPayload, verifyToken } from "../utils/jwt";

const authenticate: RequestHandler = (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  appAssert(
    accessToken,
    UNAUTHORIZED,
    "Not authorized",
    ErrorCode.InvalidAccessToken
  );

  const { payload, error } = verifyToken<AccessTokenPayload>(accessToken);
  appAssert(
    payload,
    UNAUTHORIZED,
    error === "jwt expired" ? "Token expired" : "Invalid token",
    ErrorCode.InvalidAccessToken
  );

  req.userId = payload.userId;
  req.sessionId = payload.sessionId;

  next();
};

export default authenticate;
