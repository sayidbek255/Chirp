import CodeType from "../constants/code.type";
import { CONFLICT, UNAUTHORIZED } from "../constants/http";
import CodeModel from "../models/code.model";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import appAssert from "../utils/app.assert";
import { ONE_DAY_MS, oneYearFromNow, thirtyDaysFromNow } from "../utils/date";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";

export type CreateAccountParams = {
  name: string;
  username: string;
  email: string;
  password: string;
  userAgent?: string;
};

export const createAccount = async (data: CreateAccountParams) => {
  const existingUsername = await UserModel.exists({
    username: data.username,
  });
  appAssert(!existingUsername, CONFLICT, "Username already in use");

  const existingEmail = await UserModel.exists({
    email: data.email,
  });
  appAssert(!existingEmail, CONFLICT, "Email already in use");

  const user = await UserModel.create({
    name: data.name,
    username: data.username,
    email: data.email,
    password: data.password,
  });

  const verificationCode = await CodeModel.create({
    userId: user._id,
    type: CodeType.EmailVerification,
    expiresAt: oneYearFromNow(),
  });

  const session = await SessionModel.create({
    userId: user._id,
    userAgent: data.userAgent,
  });

  const refreshToken = signToken(
    {
      sessionId: session._id,
    },
    refreshTokenSignOptions
  );

  const accessToken = signToken({
    userId: user._id,
    sessionId: session._id,
  });

  return {
    user: user.omitPassword(),
    accessToken,
    refreshToken,
  };
};

export type LoginUserParams = {
  usernameOrEmail: string;
  password: string;
  userAgent?: string;
};

export const loginUser = async (data: LoginUserParams) => {
  const user = await UserModel.findOne({
    $or: [{ username: data.usernameOrEmail }, { email: data.usernameOrEmail }],
  });
  appAssert(user, UNAUTHORIZED, "Invalid credentials");

  const isValid = await user.comparePassword(data.password);
  appAssert(isValid, UNAUTHORIZED, "Invalid credentials");

  const session = await SessionModel.create({
    userId: user._id,
    userAgent: data.userAgent,
  });

  const refreshToken = signToken(
    {
      sessionId: session._id,
    },
    refreshTokenSignOptions
  );

  const accessToken = signToken({
    userId: user._id,
    sessionId: session._id,
  });

  return {
    user: user.omitPassword(),
    accessToken,
    refreshToken,
  };
};

export const refreshUserAccessToken = async (refreshToken: string) => {
  const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });
  appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

  const session = await SessionModel.findById(payload.sessionId);
  const now = Date.now();
  appAssert(
    session && session.expiresAt.getTime() > now,
    UNAUTHORIZED,
    "Session expired"
  );

  const sessionNeedRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;

  if (sessionNeedRefresh) {
    session.expiresAt = thirtyDaysFromNow();
    await session.save();
  }

  const newRefreshToken = sessionNeedRefresh
    ? signToken({ sessionId: session._id }, refreshTokenSignOptions)
    : undefined;

  const accessToken = signToken({
    userId: session.userId,
    sessionId: session._id,
  });

  return {
    accessToken,
    newRefreshToken,
  };
};
