import express from "express";
import Pagos from "../models/pagos.js";
import Factura from "../models/Factura.js";
import db from "../config/db.js";
import { GetPagosId } from "../utils/utilsFuncion.js";

const router = express.Router();

export const handleAddPago = async (nuevoPago) => {
  try {
    // Crea una instancia del modelo Pagos con los datos del nuevo pago
    const pagoNuevo = new Pagos(nuevoPago);

    // Guarda el nuevo pago en la base de datos
    const pagoGuardado = await pagoNuevo.save();
    await pagoNuevo.validate();

    // Devuelve el pago guardado
    return pagoGuardado;
  } catch (error) {
    console.error("Error al agregar pago:", error);
    throw error; // Puedes manejar el error según tus necesidades
  }
};

router.get("/get-pagos", async (req, res) => {
  await Pagos.find()
    .then((infoPagos) => {
      res.json(infoPagos);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

// Ruta para obtener pagos por fecha
router.get("/get-pagos/:fecha", async (req, res) => {
  try {
    const fecha = req.params.fecha;

    // Utilizar agregación para unir la colección Pagos con la colección Factura
    const pagosPorFecha = await Pagos.aggregate([
      {
        $match: { "date.fecha": fecha },
      },
      {
        $lookup: {
          from: "facturas",
          let: { idOrden: "$idOrden" }, // Guardamos idOrden como es
          pipeline: [
            {
              $addFields: {
                // Convertimos _id a String
                _idToString: { $toString: "$_id" },
              },
            },
            {
              $match: {
                // Comparamos idOrden con _id convertido a String
                $expr: { $eq: ["$$idOrden", "$_idToString"] },
              },
            },
          ],
          as: "factura",
        },
      },
      {
        $unwind: "$factura", // Desenrollar el array "factura"
      },
      {
        $project: {
          // Proyectar solo los campos necesarios de la factura
          _id: "$_id",
          idUser: "$idUser",
          orden: "$factura.codRecibo",
          idOrden: "$idOrden",
          date: "$date",
          nombre: "$factura.Nombre",
          total: "$total",
          metodoPago: "$metodoPago",
          Modalidad: "$factura.Modalidad",
        },
      },
    ]);

    res.json(pagosPorFecha);
  } catch (error) {
    console.error("Error al obtener los pagos por fecha:", error);
    res.status(500).json({ mensaje: "Error al obtener los pagos por fecha" });
  }
});

// Ruta para agregar un nuevo registro de pago
router.post("/add-pago", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction(); // Comienza la transacción

  try {
    // Obtener los datos del cuerpo de la solicitud
    const { idOrden, date, metodoPago, total, idUser, isCounted } = req.body;

    // Crear una instancia del modelo Pagos con los datos recibidos
    const nuevoPago = new Pagos({
      idOrden,
      date,
      metodoPago,
      total,
      idUser,
      isCounted,
    });

    // Validar los datos del nuevo pago
    await nuevoPago.validate();

    // Guardar el nuevo pago en la base de datos dentro de la transacción
    const pagoGuardado = await nuevoPago.save({ session }, { _id: 1 });

    // Confirmar la transacción
    await session.commitTransaction();

    // Finalizar la sesión
    session.endSession();

    // Enviar la respuesta al cliente con el pago guardado
    res.json({
      tipo: "added",
      info: await GetPagosId(pagoGuardado._id.toString()),
    });
  } catch (error) {
    console.error("Error al editar el pago:", error);
    await session.abortTransaction(); // Abortar la transacción en caso de error
    session.endSession(); // Finalizar la sesión

    res
      .status(500)
      .json({ mensaje: "Error al editar el pago", error: error.message });
  }
});

// Ruta para editar un pago por su ID
router.put("/edit-pago/:idPago", async (req, res) => {
  try {
    // Obtener el ID del pago a editar desde los parámetros de la URL
    const { idPago } = req.params;

    // Obtener los nuevos datos del cuerpo de la solicitud
    const { idOrden, date, metodoPago, total, idUser } = req.body;

    // Buscar el pago por su ID y actualizarlo con los nuevos datos
    const pagoActualizado = await Pagos.findByIdAndUpdate(
      idPago,
      {
        idOrden,
        date,
        metodoPago,
        total,
        idUser,
      },
      { new: true } // Devuelve el pago actualizado después de la edición
    );

    // Verificar si se encontró y actualizó el pago
    if (!pagoActualizado) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Enviar la respuesta al cliente con el pago actualizado
    res.json({
      tipo: "updated",
      info: await GetPagosId(pagoActualizado._id.toString()),
    });
  } catch (error) {
    console.error("Error al editar el pago:", error);
    res
      .status(500)
      .json({ mensaje: "Error al editar el pago", error: error.message });
  }
});

// Ruta para eliminar un pago por su ID
router.delete("/delete-pago/:idPago", async (req, res) => {
  try {
    // Obtener el ID del pago a eliminar desde los parámetros de la URL
    const { idPago } = req.params;

    const pagoToDelete = await GetPagosId(idPago);

    // Buscar el pago por su ID y eliminarlo
    const pagoEliminado = await Pagos.findByIdAndDelete(idPago);

    // Verificar si se encontró y eliminó el pago
    if (!pagoEliminado) {
      return res.status(404).json({ mensaje: "Pago no encontrado" });
    }

    // Enviar la respuesta al cliente con el pago eliminado
    res.json({
      tipo: "deleted",
      info: pagoToDelete,
    });
  } catch (error) {
    console.error("Error al eliminar el pago:", error);
    res
      .status(500)
      .json({ mensaje: "Error al eliminar el pago", error: error.message });
  }
});

export default router;
