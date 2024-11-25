import mongoose from "mongoose";
import { MONGO_URI } from "../constants/env";

const connectToDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to the MongoDB database successfully.");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
};

export default connectToDB;
