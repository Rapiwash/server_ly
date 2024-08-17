import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://LaundrySystem:mE2tEjhiiHjzD4aW@laundry-system.kf46wwt.mongodb.net/db-omar-prueba?retryWrites=true&w=majority",
      // "mongodb+srv://rapiwash:6FbQkhpF5m9hiUnL@sistemalavanderia.6uoe00l.mongodb.net/db-lava-ya?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Conexión exitosa a MongoDB");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    process.exit(1); // Terminar el proceso con error
  }
};

export default mongoose;
