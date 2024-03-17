import express from 'express';
import Delivery from '../models/delivery.js';

const router = express.Router();

router.post('/add-delivery', (req, res) => {
  const { idCliente, name, descripcion, fecha, hora, monto, idUser, idCuadre } = req.body;

  const newDelivery = new Delivery({
    idCliente,
    name,
    descripcion,
    fecha,
    hora,
    monto,
    idUser,
    idCuadre,
  });

  newDelivery
    .save()
    .then((deliveryGuardado) => {
      res.json(deliveryGuardado);
    })
    .catch((error) => {
      console.error('Error al Guardar Delivery:', error);
      res.status(500).json({ mensaje: 'Error al Guardar Delivery' });
    });
});

router.get('/get-delivery', (req, res) => {
  Delivery.find()
    .then((deliverys) => {
      res.json(deliverys);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

router.get('/get-delivery/:idCliente', (req, res) => {
  const idCliente = req.params.idCliente;
  Delivery.find({ idCliente: idCliente })
    .then((deliveries) => {
      res.json(deliveries);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

router.get('/get-delivery-date/:fecha', (req, res) => {
  const { fecha } = req.params;

  Delivery.find({ fecha })
    .then((deliverys) => {
      res.json(deliverys);
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

router.put('/update-delivery/:idCliente', async (req, res) => {
  const { idCliente } = req.params;
  const { newName } = req.body;

  try {
    const updatedDelivery = await Delivery.findOneAndUpdate({ idCliente }, { $set: { name: newName } }, { new: true });

    if (updatedDelivery) {
      return res.json(updatedDelivery);
    } else {
      return res.status(404).json({ mensaje: 'No se encontró el documento' });
    }
  } catch (error) {
    console.error('Error al actualizar el documento:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el documento' });
  }
});

export default router;
