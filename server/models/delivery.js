import mongoose from 'mongoose';

const deliverySchema = new mongoose.Schema({
  idCliente: String, // Representa el ID de la Orden
  name: String,
  descripcion: String, // Corregido: descipcion -> descripcion
  fecha: String,
  hora: String,
  monto: String,
  idUser: String,
  idCuadre: String,
});

const Delivery = mongoose.model('Delivery', deliverySchema);

export default Delivery;
