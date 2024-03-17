import express from 'express';
import Promociones from '../models/promociones.js'; // Asegúrate de que la ruta y la extensión del archivo sean correctas

const router = express.Router();

router.put('/eliminar-promocion', async (req, res) => {
  try {
    const { codigoPromocion } = req.body;

    // Actualiza el estado de la promoción a false en lugar de eliminarla
    const actualizada = await Promociones.findOneAndUpdate(
      { codigo: codigoPromocion },
      { $set: { state: false } },
      { new: true }
    );

    res.status(200).json(actualizada);
  } catch (error) {
    console.error('Error al actualizar la promoción:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la promoción' });
  }
});

router.post('/add-promocion', async (req, res) => {
  try {
    const { prenda, cantidadMin, alcance, tipoDescuento, tipoPromocion, descripcion, descuento, vigencia } = req.body;
    if (!prenda || prenda.length === 0 || !tipoDescuento || !tipoPromocion || !alcance || !descripcion || !descuento || !vigencia) {
      return res.status(400).json({ mensaje: 'Todos los campos son requeridos.' });
    }

    const codigoPromocion = await generarCodigoPromocionUnico();

    const nuevaPromoción = new Promociones({
      codigo: codigoPromocion,
      prenda,
      cantidadMin,
      tipoDescuento,
      alcance,
      tipoPromocion,
      descripcion,
      descuento,
      vigencia,
      state: true,
    });

    const promociónGuardada = await nuevaPromoción.save();
    res.status(201).json({
      onAction: 'add',
      info: promociónGuardada,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar promoción' });
  }
});
async function generarCodigoPromocionUnico() {
  let numero = 1;
  while (true) {
    const codigoPromocion = `PROM${numero.toString().padStart(4, '0')}`;
    const codigoDuplicado = await Promociones.findOne({ codigo: codigoPromocion });
    if (!codigoDuplicado) {
      return codigoPromocion;
    }
    numero++;
  }
}

router.get('/get-promociones', (req, res) => {
  Promociones.find({ state: { $ne: false } }) // $ne selecciona los documentos donde 'state' no es igual a 'false'
    .then((promos) => {
      res.json(promos);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});
export default router;
