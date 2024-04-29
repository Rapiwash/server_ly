import express from "express";
import Almacen from "../models/almacen.js";
import Factura from "../models/Factura.js";
import moment from "moment";
import db from "../config/db.js";

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
    const reportesFacturas = await Almacen.aggregate([
      {
        $unwind: "$serviceOrder", // Desenrollar el array de serviceOrder
      },
      {
        $addFields: {
          serviceOrderId: { $toObjectId: "$serviceOrder" }, // Convertir cada elemento de serviceOrder a ObjectId
        },
      },
      {
        $lookup: {
          from: "facturas",
          localField: "serviceOrderId",
          foreignField: "_id",
          as: "factura",
        },
      },
      {
        $unwind: "$factura", // Desenrollar el array de documentos de factura
      },
      {
        $match: {
          "factura.estadoPrenda": "pendiente", // Filtrar las facturas con estado pendiente
        },
      },
      {
        $addFields: {
          factura: {
            $mergeObjects: ["$factura", { dateStorage: "$storageDate" }],
          }, // Combinar campos de factura con dateStorage
        },
      },
      {
        $replaceRoot: { newRoot: "$factura" }, // Hacer que los campos de factura sean el nuevo root del documento
      },
      {
        $lookup: {
          from: "pagos",
          let: { facturaId: "$_id" }, // Variable local para el _id de la factura
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$idOrden", { $toString: "$$facturaId" }] }, // Convertir el _id de la factura a string y compararlo con idOrden
              },
            },
          ],
          as: "ListPago", // Nombre del campo donde se almacenarán los pagos relacionados
        },
      },
      {
        $addFields: {
          ListPago: {
            $map: {
              input: "$ListPago", // Itera sobre los pagos relacionados
              as: "pago", // Alias para cada pago
              in: {
                // Agrega los campos específicos del pago
                _id: "$$pago._id",
                idUser: "$$pago.idUser",
                idOrden: "$$pago.idOrden",
                orden: "$codRecibo",
                date: "$$pago.date",
                nombre: "$Nombre",
                total: "$$pago.total",
                metodoPago: "$$pago.metodoPago",
                Modalidad: "$Modalidad",
              },
            },
          },
        },
      },
    ]);

    res.status(200).json(reportesFacturas);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res
      .status(500)
      .json({ mensaje: "No se pudo obtener facturas almacenadas" });
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
