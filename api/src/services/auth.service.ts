import CodeType from "../constants/code.type";
import { APP_ORIGIN } from "../constants/env";
import {
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../constants/http";
import CodeModel from "../models/code.model";
import SessionModel from "../models/session.model";
import UserModel from "../models/user.model";
import appAssert from "../utils/app.assert";
import { hashValue } from "../utils/bcrypt";
import {
  fiveMinutesAgo,
  ONE_DAY_MS,
  oneHourFromNow,
  oneYearFromNow,
  thirtyDaysFromNow,
} from "../utils/date";
import {
  getPasswordResetTemplate,
  getVerifyEmailTemplate,
} from "../utils/email.templates";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";
import { sendMail } from "../utils/send.mail";

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

  const url = `${APP_ORIGIN}/email/verify/${verificationCode._id}`;

  const { error } = await sendMail({
    to: user.email,
    ...getVerifyEmailTemplate(url),
  });

  if (error) console.log(error);

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

export const verifyEmail = async (code: string) => {
  const validCode = await CodeModel.findOne({
    _id: code,
    type: CodeType.EmailVerification,
    expiresAt: { $gt: new Date() },
  });
  appAssert(validCode, UNAUTHORIZED, "Invalid or expired verification code");

  const updatedUser = await UserModel.findByIdAndUpdate(
    validCode.userId,
    { verified: true },
    { new: true }
  );
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to verify email");

  await validCode.deleteOne();

  return {
    user: updatedUser.omitPassword(),
  };
};

export const sendPasswordResetEmail = async (email: string) => {
  const user = await UserModel.findOne({ email });
  appAssert(user, UNAUTHORIZED, "User not found");

  const fiveMinAgo = fiveMinutesAgo();

  const count = await CodeModel.countDocuments({
    userId: user._id,
    type: CodeType.PasswordReset,
    expiresAt: { $gt: fiveMinAgo },
  });
  appAssert(
    count < 1,
    TOO_MANY_REQUESTS,
    "Too many requests, please try again later"
  );

  const expiresAt = oneHourFromNow();
  const verificationCode = await CodeModel.create({
    userId: user._id,
    type: CodeType.PasswordReset,
    expiresAt,
  });

  const url = `${APP_ORIGIN}/password/reset?code=${
    verificationCode._id
  }&exp=${expiresAt.getTime()}`;

  const { data, error } = await sendMail({
    to: user.email,
    ...getPasswordResetTemplate(url),
  });
  appAssert(
    data?.id,
    INTERNAL_SERVER_ERROR,
    `${error?.name} - ${error?.message}`
  );

  return {
    url,
    emailId: data.id,
  };
};

type ResetPasswordParams = {
  password: string;
  code: string;
};

export const resetPassword = async ({
  password,
  code,
}: ResetPasswordParams) => {
  const validCode = await CodeModel.findOne({
    _id: code,
    type: CodeType.PasswordReset,
    expiresAt: { $gt: new Date() },
  });
  appAssert(validCode, NOT_FOUND, "Invalid or expired verification code");

  const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, {
    password: await hashValue(password),
  });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, "Failed to reset password");

  await validCode.deleteOne();

  await SessionModel.deleteMany({
    userId: updatedUser._id,
  });

  return {
    user: updatedUser.omitPassword(),
  };
};
