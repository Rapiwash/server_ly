import express from "express";
import Almacen from "../models/almacen.js";
import Factura from "../models/Factura.js";
import moment from "moment";
import db from "../config/db.js";
import Pagos from "../models/pagos.js";
import { handleGetInfoUser } from "./cuadreDiario.js";

const router = express.Router();

// Nueva ruta para realizar ambas operaciones
router.post("/add-to-warehouse", async (req, res) => {
  // Iniciar una transacción
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { Ids } = req.body;
    // Actualizar la ubicación de las facturas
    const updatedFacturas = [];
    // Agregar las facturas al almacén
    const fechaHora = moment().format("YYYY-MM-DD HH:mm");
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
          fecha: fechaHora.split(" ")[0],
          hora: fechaHora.split(" ")[1],
        },
      });
    }

    const almacenamiento = new Almacen({
      serviceOrder: Ids,
      storageDate: {
        fecha: fechaHora.split(" ")[0],
        hora: fechaHora.split(" ")[1],
      },
    });

    await almacenamiento.save({ session: session });

    res.status(200).json(updatedFacturas);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    res
      .status(500)
      .json({ mensaje: "Error en la transacción", error: error.message });
  }
});

router.get("/get-warehouse-service-order", async (req, res) => {
  try {
    // Obtener todos los documentos de la colección Almacen
    const almacenes = await Almacen.find();

    // Array para almacenar todas las facturas
    let todasLasFacturas = [];

    // Recorrer cada documento de Almacen
    for (const almacen of almacenes) {
      // Recorrer cada serviceOrder del documento
      for (const orderId of almacen.serviceOrder) {
        // Buscar la factura relacionada con el orderId
        const factura = await Factura.findOne({ _id: orderId }).lean();
        const pagosIds = factura.listPago;

        // Buscar los detalles de cada pago usando los IDs
        const ListPago = await Promise.all(
          pagosIds.map(async (pagoId) => {
            const pago = await Pagos.findById(pagoId);
            if (!pago) {
              throw new Error(`Pago con ID ${pagoId} no encontrado`);
            }
            const infoUser = await handleGetInfoUser(pago.idUser);
            return {
              _id: pago._id,
              idUser: pago.idUser,
              orden: factura.codRecibo,
              idOrden: pago.idOrden,
              date: pago.date,
              nombre: factura.Nombre,
              total: pago.total,
              metodoPago: pago.metodoPago,
              Modalidad: factura.Modalidad,
              isCounted: pago.isCounted,
              infoUser: infoUser,
            };
          })
        );

        // Si se encuentra una factura, agregarla a todasLasFacturas
        if (factura) {
          todasLasFacturas.push({
            ...factura,
            dateStorage: almacen.storageDate,
            ListPago,
          });
        }
      }
    }

    res.status(200).json(todasLasFacturas);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "No se pudo obtener las facturas" });
  }
});

router.delete("/remove-from-warehouse/:id", async (req, res) => {
  try {
    const { id } = req.params; // Obtén el ID que se desea eliminar

    // Actualiza todos los registros de Almacen
    await Almacen.updateMany(
      { serviceOrder: id },
      { $pull: { serviceOrder: id } }
    );
    res.status(200).json({ mensaje: "Valor removido de Almacen" });
  } catch (error) {
    console.error("Error al eliminar el valor de serviceOrder: ", error);
    res.status(500).json({ mensaje: "No remover orden de almacen" });
  }
});

export default router;
