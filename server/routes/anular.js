import express from "express";
import Anular from "../models/anular.js";
import { openingHours } from "../middleware/middleware.js";
import moment from "moment";
import Factura from "../models/Factura.js";
import Usuarios from "../models/usuarios/usuarios.js";
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

    // Obtener los reportes anulados en el rango de fechas del mes
    const reportesAnulados = await Anular.find({
      fecha: {
        $gte: momentFecha.startOf("month").format("YYYY-MM-DD"), // Fecha de inicio del mes
        $lt: momentFecha.endOf("month").format("YYYY-MM-DD"), // Fecha de fin del mes
      },
    }).lean();

    // Obtener la información adicional de cada reporte anulado
    const reportesDetallados = await Promise.all(
      reportesAnulados.map(async (anulado) => {
        // Buscar la factura asociada al reporte anulado y seleccionar los campos deseados
        const factura = await Factura.findOne(
          { _id: anulado._id },
          { codRecibo: 1, Nombre: 1, totalNeto: 1, dateRecepcion: 1 }
        );

        // Buscar el usuario responsable del reporte anulado y seleccionar los campos deseados
        const responsable = await Usuarios.findOne(
          { _id: anulado.idUser },
          { name: 1, rol: 1 }
        );

        return {
          _id: anulado._id,
          codRecibo: factura.codRecibo,
          Nombre: factura.Nombre,
          totalNeto: factura.totalNeto,
          dateRecepcion: factura.dateRecepcion,
          fechaAnulacion: {
            fecha: anulado.fecha,
            hora: anulado.hora,
          },
          motivo: anulado.motivo,
          responsable: { name: responsable.name, rol: responsable.rol },
        };
      })
    );

    res.json(reportesDetallados);
  } catch (error) {
    console.error("Error al obtener los reportes anulados:", error);
    res.status(500).json({ mensaje: "Error al obtener los reportes anulados" });
  }
});
export default router;
