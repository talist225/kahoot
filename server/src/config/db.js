import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error('Make sure MongoDB is running. Install & start it:');
    console.error('  - Windows: https://www.mongodb.com/try/download/community');
    console.error('  - Or use Docker: docker run -d -p 27017:27017 mongo');
    return false;
  }
};

export default connectDB;
