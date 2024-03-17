import express from 'express';
import Gasto from '../models/gastos.js';
import { openingHours } from '../middleware/middleware.js';
const router = express.Router();

router.post('/add-gasto', openingHours, (req, res) => {
  const { infoGasto } = req.body;
  const { descripcion, fecha, hora, monto, idUser, idCuadre } = infoGasto;

  const newGasto = new Gasto({
    descripcion,
    fecha,
    hora,
    monto,
    idUser,
    idCuadre,
  });

  newGasto
    .save()
    .then((gastoSaved) => {
      res.json(gastoSaved);
    })
    .catch((error) => {
      console.error('Error al Guardar Delivery:', error);
      res.status(500).json({ mensaje: 'Error al Guardar Delivery' });
    });
});

router.get('/get-gastos', (req, res) => {
  Gasto.find()
    .then((infoGastos) => {
      res.json(infoGastos);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

router.get('/get-gastos-date/:fecha', (req, res) => {
  const { fecha } = req.params;

  Gasto.find({ fecha })
    .then((infoGastos) => {
      res.json(infoGastos);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

export default router;
