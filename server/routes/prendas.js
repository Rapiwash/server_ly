import express from 'express';
import Prendas from '../models/prendas.js';
import { prendasPorDefecto } from '../utils/varsGlobal.js';
const router = express.Router();

router.put('/update-prendas', (req, res) => {
  const nuevasPrendas = req.body.prendas; // Datos nuevos que llegan en la solicitud

  Prendas.findOneAndUpdate({}, { prendas: nuevasPrendas }, { new: true })
    .then((updatedPrendas) => {
      if (updatedPrendas) {
        res.json(updatedPrendas.prendas);
      } else {
        res.status(404).json({ mensaje: 'Prendas no encontradas' });
      }
    })
    .catch((error) => {
      console.error('Error al actualizar los datos:', error);
      res.status(500).json({ mensaje: 'Error al actualizar los datos' });
    });
});

router.get('/get-prendas', (req, res) => {
  Prendas.findOne() // Intenta encontrar un registro existente
    .then((infoPrendas) => {
      if (infoPrendas) {
        res.json(infoPrendas.prendas);
      } else {
        // Si no existe, crea un nuevo registro con las prendas por defecto

        Prendas.create({ prendas: prendasPorDefecto })
          .then((nuevasPrendas) => {
            res.json(nuevasPrendas.prendas);
          })
          .catch((error) => {
            console.error('Error al crear las nuevas prendas:', error);
            res.status(500).json({ mensaje: 'Error al crear las nuevas prendas' });
          });
      }
    })
    .catch((error) => {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ mensaje: 'Error al obtener los datos' });
    });
});

export default router;
