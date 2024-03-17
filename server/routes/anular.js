import express from 'express';
import Anular from '../models/anular.js';
import { openingHours } from '../middleware/middleware.js';
const router = express.Router();

router.post('/anular-factura', openingHours, (req, res) => {
  const { infoAnulacion } = req.body;
  const { _id, motivo, fecha, hora, idUser } = infoAnulacion;

  const newAnulacion = new Anular({
    _id,
    motivo,
    fecha,
    hora,
    idUser,
  });

  newAnulacion
    .save()
    .then((anulado) => {
      res.json(anulado);
    })
    .catch((error) => {
      console.error('Error al anular cliente:', error);
      res.status(500).json({ mensaje: 'Error al anular cliente:' });
    });
});

router.get('/get-anulado/:idCliente', (req, res) => {
  const idCliente = req.params.idCliente;

  Anular.findById(idCliente)
    .then((anulado) => {
      if (!anulado) {
        return res.json(null);
      }
      res.json(anulado);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

export default router;
