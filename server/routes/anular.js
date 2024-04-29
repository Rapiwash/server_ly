import express from "express";
import Anular from "../models/anular.js";
import { openingHours } from "../middleware/middleware.js";
import moment from "moment";
const router = express.Router();

router.post("/anular-factura", openingHours, (req, res) => {
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
      console.error("Error al anular cliente:", error);
      res.status(500).json({ mensaje: "Error al anular cliente:" });
    });
});

router.get("/get-anulado/:idCliente", (req, res) => {
  const idCliente = req.params.idCliente;

  Anular.findById(idCliente)
    .then((anulado) => {
      if (!anulado) {
        return res.json(null);
      }
      res.json(anulado);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

router.get("/get-reporte-anulados/:date", async (req, res) => {
  try {
    const InfoFecha = req.params.date;
    const momentFecha = moment(InfoFecha, "YYYY-MM-DD");

    // Consultar los reportes anulados en el rango de fechas del mes
    const reportesAnulados = await Anular.aggregate([
      {
        $match: {
          fecha: {
            $gte: momentFecha.startOf("month").format("YYYY-MM-DD"), // Fecha de inicio del mes
            $lt: momentFecha.endOf("month").format("YYYY-MM-DD"), // Fecha de fin del mes
          },
        },
      },
      {
        $addFields: {
          anuladoObjectId: { $toObjectId: "$_id" }, // Convertir el campo _id a ObjectId
          usuarioObjectId: { $toObjectId: "$idUser" }, // Convertir el campo _id a ObjectId
        },
      },
      {
        $lookup: {
          from: "facturas",
          localField: "anuladoObjectId",
          foreignField: "_id",
          as: "factura",
        },
      },
      {
        $unwind: "$factura", // Desenrollar el array de documentos de factura
      },
      {
        $lookup: {
          from: "Usuarios",
          localField: "usuarioObjectId",
          foreignField: "_id",
          as: "usuario",
        },
      },
      {
        $unwind: "$usuario", // Desenrollar el array de documentos de usuario
      },
      {
        $project: {
          _id: 1,
          codRecibo: "$factura.codRecibo",
          Nombre: "$factura.Nombre",
          totalNeto: "$factura.totalNeto",
          dateRecepcion: "$factura.dateRecepcion",
          fechaAnulacion: {
            fecha: "$fecha",
            hora: "$hora",
          },
          motivo: 1,
          responsable: { name: "$usuario.name", rol: "$usuario.rol" },
        },
      },
    ]);

    res.json(reportesAnulados);
  } catch (error) {
    console.error("Error al obtener los reportes anulados:", error);
    res.status(500).json({ mensaje: "Error al obtener los reportes anulados" });
  }
});
export default router;
