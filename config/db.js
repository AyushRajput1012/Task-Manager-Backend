const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri);
  // eslint-disable-next-line no-console
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
