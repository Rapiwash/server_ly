import mongoose from 'mongoose';

const cuadreDiarioSchema = new mongoose.Schema(
  {
    index: Number,
    date: {
      fecha: String,
      hora: String,
    },
    cajaInicial: String,
    Montos: Array,
    estado: String,
    margenError: String,
    corte: String,
    cajaFinal: String,
    ingresos: Object,
    egresos: Object,
    notas: [],
    userID: String,
  },
  { collection: 'CuadreDiario' }
);

const CuadreDiario = mongoose.model('CuadreDiario', cuadreDiarioSchema);

export default CuadreDiario;
