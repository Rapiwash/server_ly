import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      // "mongodb+srv://LaundrySystem:mE2tEjhiiHjzD4aW@laundry-system.kf46wwt.mongodb.net/db-laundry-system?retryWrites=true&w=majority",
      "mongodb+srv://LaundrySystem:mE2tEjhiiHjzD4aW@laundry-system.kf46wwt.mongodb.net/db-desarrollo-system?retryWrites=true&w=majority",
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

// import mongoose from "mongoose";
// import axios from "axios"; // Importa axios para hacer solicitudes HTTP

// export const connectDB = async () => {
//   try {
//     await mongoose.connect(
//       "mongodb+srv://LaundrySystem:mE2tEjhiiHjzD4aW@laundry-system.kf46wwt.mongodb.net/db-desarrollo-system?retryWrites=true&w=majority",
//       {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       }
//     );
//     console.log("Conexión exitosa a MongoDB");

//     // Luego de conectarse exitosamente a MongoDB, reinicia el servicio en Render
//     await restartRenderService('your-service-id'); // Reemplaza 'your-service-id' con el ID de tu servicio en Render
//   } catch (error) {
//     console.error("Error al conectar a MongoDB:", error);
//     process.exit(1); // Terminar el proceso con error
//   }
// };

// async function restartRenderService(serviceId) {
//   try {
//     const response = await axios.post(`|`);
//     console.log("Servicio reiniciado en Render:", response.data);
//   } catch (error) {
//     console.error("Error al reiniciar el servicio en Render:", error);
//   }
// }

// export default mongoose;
