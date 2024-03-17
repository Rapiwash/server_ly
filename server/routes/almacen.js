import express from 'express';
import Almacen from '../models/almacen.js';
import Factura from '../models/Factura.js';
import moment from 'moment';
import db from '../config/db.js';

const router = express.Router();

// Nueva ruta para realizar ambas operaciones
router.post('/add-to-warehouse', async (req, res) => {
  // Iniciar una transacción
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { Ids } = req.body;
    // Actualizar la ubicación de las facturas
    const updatedFacturas = [];
    // Agregar las facturas al almacén
    const fechaHora = moment().format('YYYY-MM-DD HH:mm');
    for (const facturaId of Ids) {
      const factura = await Factura.findById(facturaId).session(session);
      if (!factura) {
        throw new Error(`Factura no encontrada: ${facturaId}`);
      }

      factura.location = 2;
      await factura.save({ session: session });

      updatedFacturas.push({
        ...factura.toObject(),
        dateStorage: {
          fecha: fechaHora.split(' ')[0],
          hora: fechaHora.split(' ')[1],
        },
      });
    }

    const almacenamiento = new Almacen({
      serviceOrder: Ids,
      storageDate: {
        fecha: fechaHora.split(' ')[0],
        hora: fechaHora.split(' ')[1],
      },
    });

    await almacenamiento.save({ session: session });

    res.status(200).json(updatedFacturas);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ mensaje: 'Error en la transacción', error: error.message });
  }
});

router.get('/get-warehouse-service-order', async (req, res) => {
  try {
    // Obtén todos los registros de Almacen
    const almacenRegistros = await Almacen.find();

    // Array para almacenar los resultados finales
    const resultados = [];

    // Itera a través de los registros de Almacen
    for (const almacenRegistro of almacenRegistros) {
      // Itera a través de los serviceOrder del registro de Almacen
      for (const serviceOrderId of almacenRegistro.serviceOrder) {
        // Encuentra la factura correspondiente a serviceOrderId
        const factura = await Factura.findOne({ _id: serviceOrderId });

        if (factura && factura.estadoPrenda === 'pendiente') {
          // Convierte el objeto factura a un objeto JavaScript estándar
          const facturaObj = factura.toObject();

          // Crea un objeto que incluye todos los campos de factura y agrega dateStorage
          const resultadoFactura = {
            ...facturaObj,
            dateStorage: almacenRegistro.storageDate,
          };

          // Agrega el objeto a los resultados
          resultados.push(resultadoFactura);
        }
      }
    }

    res.status(200).json(resultados);
  } catch (error) {
    console.error('Error al obtener datos: ', error);
    res.status(500).json({ mensaje: 'No se pudo obtener ordenes almacenadas' });
  }
});

router.delete('/remove-from-warehouse/:id', async (req, res) => {
  try {
    const { id } = req.params; // Obtén el ID que se desea eliminar

    // Actualiza todos los registros de Almacen
    await Almacen.updateMany({ serviceOrder: id }, { $pull: { serviceOrder: id } });
    res.status(200).json({ mensaje: 'Valor removido de Almacen' });
  } catch (error) {
    console.error('Error al eliminar el valor de serviceOrder: ', error);
    res.status(500).json({ mensaje: 'No remover orden de almacen' });
  }
});

export default router;
