import mongoose from 'mongoose';

const prendasSchema = new mongoose.Schema(
  {
    prendas: [],
  },
  { collection: 'Prendas' }
);

const Prendas = mongoose.model('Prendas', prendasSchema);

export default Prendas;
