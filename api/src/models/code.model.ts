import mongoose from "mongoose";
import CodeType from "../constants/code.type";

export interface CodeDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: CodeType;
  createdAt: Date;
  expiresAt: Date;
}

const codeSchema = new mongoose.Schema<CodeDocument>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const CodeModel = mongoose.model<CodeDocument>("Code", codeSchema);

export default CodeModel;
