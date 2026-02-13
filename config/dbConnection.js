import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    // await mongoose.connect("mongodb://localhost:37017/mydatabase");
    console.log(`MongoDB Connection Success.`);
  } catch (err) {
    console.log(err);
  }
};

export default connectDatabase;
