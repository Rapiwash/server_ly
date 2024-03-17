import mongoose from 'mongoose';

const ServicioSchema = new mongoose.Schema(
  {
    codigo: String,
    nombre: String,
    idCategoria: String,
    precioVenta: Number,
    dateCreation: String,
    simboloMedida: String,
    estado: Boolean,
  },
  { collection: 'Servicio' }
);

const Servicio = mongoose.model('Servicio', ServicioSchema);

export default Servicio;
