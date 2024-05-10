import express from "express";
import Gasto from "../models/gastos.js";
import TipoGasto from "../models/tipoGastos.js";
import { openingHours } from "../middleware/middleware.js";
import { handleGetInfoUser } from "./cuadreDiario.js";
import moment from "moment";
const router = express.Router();

export const handleAddGasto = async (nuevoGasto) => {
  try {
    // Crea una instancia del modelo Gasto con los datos del nuevo gasto
    const gastoNuevo = new Gasto(nuevoGasto);

    // Guarda el nuevo gasto en la base de datos
    const gastoGuardado = await gastoNuevo.save();
    const gastoS = gastoGuardado.toObject();
    // Devuelve el gasto guardado
    return {
      tipo: "added",
      info: {
        ...gastoS,
        infoUser: await handleGetInfoUser(gastoS.idUser),
      },
    };
  } catch (error) {
    console.error("Error al agregar gasto:", error);
    throw error; // Puedes manejar el error según tus necesidades
  }
};

router.post("/add-gasto", openingHours, (req, res) => {
  const { infoGasto } = req.body;
  const { idTipoGasto, tipo, motivo, monto, idUser } = infoGasto;

  const date = {
    fecha: moment().format("YYYY-MM-DD"),
    hora: moment().format("HH:mm"),
  };

  const newGasto = new Gasto({
    idTipoGasto,
    tipo,
    motivo,
    date,
    monto,
    idUser,
  });

  newGasto
    .save()
    .then(async (gastoSaved) => {
      const gastoS = gastoSaved.toObject();
      res.json({
        tipo: "added",
        info: {
          ...gastoS,
          infoUser: await handleGetInfoUser(gastoS.idUser),
        },
      });
    })
    .catch((error) => {
      console.error("Error al Guardar Delivery:", error);
      res.status(500).json({ mensaje: "Error al Guardar Delivery" });
    });
});

router.get("/get-gastos/:fecha", async (req, res) => {
  try {
    const fecha = req.params.fecha;

    // Parsear la fecha usando Moment.js
    const momentFecha = moment(fecha, "YYYY-MM-DD");
    const inicioMes = moment(momentFecha).startOf("month").format("YYYY-MM-DD");
    const finMes = moment(momentFecha).endOf("month").format("YYYY-MM-DD");

    // Consultar todos los tipos de gastos
    const tiposGastos = await TipoGasto.find();

    // Agregar pipeline para filtrar los gastos del mes especificado y obtener la información del usuario asociada
    const gastosAggregate = await Gasto.aggregate([
      {
        $match: {
          "date.fecha": {
            $gte: inicioMes,
            $lte: finMes,
          },
        },
      },
      {
        $addFields: {
          idUser: { $toObjectId: "$idUser" }, // Convertir idUser de string a ObjectId
        },
      },
      {
        $lookup: {
          from: "Usuarios",
          localField: "idUser",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $group: {
          _id: "$tipo",
          cantidad: { $sum: 1 },
          monto: { $sum: { $toDouble: "$monto" } },
          infoGastos: {
            $push: {
              motivo: "$motivo",
              date: "$date",
              monto: { $toDouble: "$monto" },
              infoUser: {
                name: "$userInfo.name",
                rol: "$userInfo.rol",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          cantidad: 1,
          monto: 1,
          infoGastos: 1,
        },
      },
    ]);

    // Combinar la información de tipos de gastos con los resultados de la agregación
    const tipoGastosArray = tiposGastos.map((tipo) => {
      const gasto = gastosAggregate.find((gasto) => gasto.name === tipo.name);
      return {
        id: tipo._id,
        name: tipo.name,
        cantidad: gasto ? gasto.cantidad : 0,
        monto: gasto ? gasto.monto : 0,
        infoGastos: gasto ? gasto.infoGastos : [],
      };
    });

    res.json(tipoGastosArray);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ruta para eliminar un gasto por su ID
router.delete("/delete-gasto/:id", openingHours, async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar y eliminar el gasto por su ID
    const gastoEliminado = await Gasto.findByIdAndDelete(id);
    if (!gastoEliminado) {
      throw new Error("No se encontró el gasto para eliminar");
    }

    res.json({
      tipo: "deleted",
      info: {
        ...gastoEliminado.toObject(),
      },
    });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    res.status(500).json({ mensaje: "Error al eliminar el gasto" });
  }
});

export default router;
