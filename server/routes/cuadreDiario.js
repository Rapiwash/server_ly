import express from "express";
import CuadreDiario from "../models/cuadreDiario.js";
import Factura from "../models/Factura.js";
import Anular from "../models/anular.js";
import Gasto from "../models/gastos.js";
import Usuario from "../models/usuarios/usuarios.js";
import moment from "moment";

import { openingHours } from "../middleware/middleware.js";
import { GetAnuladoId, GetOrderId } from "../utils/utilsFuncion.js";
import Pagos from "../models/pagos.js";
const router = express.Router();

export const handleGetInfoUser = async (id) => {
  const iUser = await Usuario.findById(id).lean();

  return {
    _id: iUser._id,
    name: iUser.name,
    usuario: iUser.usuario,
    rol: iUser.rol,
  };
};

router.post("/save-cuadre", openingHours, async (req, res) => {
  const { infoCuadre } = req.body;

  try {
    // Obtén el valor máximo actual de 'index' en tus documentos
    const maxIndex = await CuadreDiario.findOne(
      {},
      { index: 1 },
      { sort: { index: -1 } }
    );

    // Calcula el nuevo valor de 'index'
    const newIndex = maxIndex ? maxIndex.index + 1 : 1;

    // Crea un nuevo cuadre con el nuevo valor de 'index'
    const newCuadre = new CuadreDiario({ ...infoCuadre, index: newIndex });

    // Guarda el nuevo cuadre en la base de datos
    const cuadreSavedDocument = await newCuadre.save();
    const cuadreSaved = cuadreSavedDocument.toObject();

    res.json("Guardado Exitoso");
  } catch (error) {
    console.error("Error al Guardar Delivery:", error);
    res.status(500).json({ mensaje: "Error al Guardar Delivery" });
  }
});

router.put("/update-cuadre/:id", openingHours, async (req, res) => {
  const { id } = req.params;
  const { infoCuadre, orders, deliverys, gastos } = req.body;

  try {
    // Actualiza el cuadre en la colección CuadreDiario
    const cuadreUpdate = await CuadreDiario.findByIdAndUpdate(id, infoCuadre, {
      new: true,
    }).lean();

    if (!cuadreUpdate) {
      return res.status(404).json({ mensaje: "Cuadre no encontrado" });
    }

    // res.json({ ...cuadreUpdate, infoUser: await handleGetInfoUser(cuadreUpdate.userID), userID: undefined });
    res.json("Actualizacion Exitosa");
  } catch (error) {
    console.error("Error al actualizar el cuadre:", error);
    res.status(500).json({ mensaje: "Error al actualizar el cuadre" });
  }
});

router.get("/get-cuadre/date/:dateCuadre", async (req, res) => {
  const { dateCuadre } = req.params;

  try {
    const infoCuadres = await CuadreDiario.findOne({
      dateCuadres: dateCuadre,
    }).lean();

    if (!infoCuadres) {
      return res.json(null);
    }

    // Enrich 'listCuadres' with specific user information and remove 'userID'
    const newListCuadres = await Promise.all(
      infoCuadres.listCuadres.map(async (cuadre) => {
        try {
          const userInfo = await Usuario.findById(cuadre.userID);
          const { _id, name, usuario } = userInfo;
          return { ...cuadre, userInfo: { _id, name, usuario } };
        } catch (error) {
          console.error("Error al obtener información del usuario:", error);
          return cuadre;
        }
      })
    );

    infoCuadres.listCuadres = newListCuadres.map(
      ({ userID, ...cuadre }) => cuadre
    );

    res.json(infoCuadres);
  } catch (error) {
    console.error("Error al obtener el dato:", error);
    res.status(500).json({ mensaje: "Error al obtener el dato" });
  }
});

router.get("/get-cuadre/last", async (req, res) => {
  try {
    // 2. Encontrar el último cuadre de toda la colección.
    let lastCuadre = await CuadreDiario.findOne().sort({ index: -1 }).lean();

    if (lastCuadre) {
      res.json({
        ...lastCuadre,
        infoUser: await handleGetInfoUser(lastCuadre.userID),
        userID: undefined,
        type: "update",
        enable: false,
        saved: true,
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el cuadre." });
  }
});

async function obtenerInformacionDetallada(listCuadres) {
  try {
    for (let cuadre of listCuadres) {
      cuadre.Pagos = await Promise.all(
        cuadre.Pagos.map(async (pagoId) => {
          const pago = await Pagos.findById(pagoId, {
            total: 1,
            metodoPago: 1,
            idOrden: 1,
            idUser: 1,
          });
          const factura = await Factura.findById(pago.idOrden, {
            codRecibo: 1,
            Nombre: 1,
            Modalidad: 1,
          });
          return {
            _id: pagoId,
            orden: factura.codRecibo,
            nombre: factura.Nombre,
            total: pago.total,
            metodoPago: pago.metodoPago,
            Modalidad: factura.Modalidad,
            idUser: pago.idUser,
          };
        })
      );
      cuadre.Gastos = await Promise.all(
        cuadre.Gastos.map(async (gastoId) => {
          const gasto = await Gasto.findById(gastoId, {
            date: 1,
            motivo: 1,
            tipo: 1,
            monto: 1,
            idUser: 1,
          });

          return {
            _id: gastoId,
            tipo: gasto.tipo,
            date: gasto.date,
            motivo: gasto.motivo,
            monto: gasto.monto,
            idUser: gasto.idUser,
          };
        })
      );
      const iUser = await handleGetInfoUser(cuadre.userID); // Suponiendo que tienes una función handleGetInfoUser para obtener información de usuario
      cuadre.infoUser = iUser;
      cuadre.userID = undefined;
    }
    return listCuadres;
  } catch (error) {
    console.error("Error al obtener información detallada:", error);
    throw new Error("Error al obtener información detallada");
  }
}

const handleGetMovimientosNCuadre = async (date, listCuadres) => {
  // Mapear y obtener los arrays de pagos y gastos de cada documento
  const IdsPagos = [].concat(
    ...listCuadres.map((cuadre) => cuadre.Pagos.map((pago) => pago._id))
  );
  const IdsGastos = [].concat(
    ...listCuadres.map((cuadre) => cuadre.Gastos.map((gasto) => gasto._id))
  );

  // Obtener todos los pagos en la fecha especificada
  const listPagos = await Pagos.aggregate([
    {
      $match: { "date.fecha": date, isCounted: { $ne: false } },
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

  // Obtener todos los gastos en la fecha especificada
  const listGastos = await Gasto.find({
    "date.fecha": date,
  }).lean();

  // Crear un conjunto de IDs para una búsqueda más eficiente
  const setIDsPagos = new Set(IdsPagos);

  const setIDsGastos = new Set(IdsGastos);

  // Filtrar y obtener los pagos que no se encuentren en IDsPagos

  const pagosNCuadre = await Promise.all(
    listPagos
      .filter((pago) => !setIDsPagos.has(pago._id.toString()))
      .map(async (pago) => {
        return {
          ...pago,
          infoUser: await handleGetInfoUser(pago.idUser),
        };
      })
  );

  // Filtrar y obtener los gastos que no se encuentren en IdsGastos

  const gastosNCuadre = await Promise.all(
    listGastos
      .filter((gasto) => !setIDsGastos.has(gasto._id.toString()))
      .map(async (gasto) => {
        return {
          ...gasto,
          infoUser: await handleGetInfoUser(gasto.idUser),
        };
      })
  );

  return { pagosNCuadre, gastosNCuadre };
};

router.get("/get-cuadre/:idUsuario/:datePrincipal", async (req, res) => {
  try {
    const { idUsuario, datePrincipal } = req.params;

    // 1. Encontrar el último cuadre de toda la colección.
    let lastCuadre = await CuadreDiario.findOne().sort({ index: -1 }).lean();

    // 2. Buscar por la fecha dada.
    let listCuadres = await CuadreDiario.find({
      "date.fecha": datePrincipal,
      // _id: { $ne: lastCuadre._id }, // Excluimos el _id de lastCuadre
    }).lean();

    listCuadres = await obtenerInformacionDetallada(listCuadres);
    if (lastCuadre !== null) {
      const [infoDetailLastCuadre] = await obtenerInformacionDetallada([
        lastCuadre,
      ]);
      lastCuadre = infoDetailLastCuadre;
    }

    const dPrincipal = moment(datePrincipal, "YYYY-MM-DD");

    // 3. Agregar atributo 'enable' a cada elemento de listCuadres.
    if (listCuadres.length > 0 && lastCuadre) {
      const dLastCuadre = moment(lastCuadre.date.fecha, "YYYY-MM-DD");
      listCuadres = listCuadres.map((elemento) => {
        if (
          dPrincipal.isSame(dLastCuadre) &&
          elemento._id === lastCuadre._id &&
          elemento.infoUser._id === lastCuadre.infoUser._id
        ) {
          return { ...elemento, type: "update", enable: false, saved: true };
        } else {
          return { ...elemento, type: "view", enable: true, saved: true };
        }
      });
    }

    const infoBase = {
      date: {
        fecha: datePrincipal,
        hora: "",
      },
      cajaInicial: 0,
      Montos: [],
      totalCaja: "",
      estado: "",
      margenError: "",
      corte: 0,
      cajaFinal: 0,
      ingresos: {
        efectivo: "",
        transferencia: "",
        tarjeta: "",
      },
      egresos: {
        gastos: "",
      },
      notas: [],
      infoUser: await handleGetInfoUser(idUsuario),
      Pagos: [],
      Gastos: [],
    };

    let cuadreActual = infoBase;

    if (lastCuadre) {
      const dLastCuadre = moment(lastCuadre.date.fecha, "YYYY-MM-DD");
      // =
      if (dPrincipal.isSame(dLastCuadre)) {
        if (idUsuario === lastCuadre.infoUser._id.toString()) {
          cuadreActual = {
            ...lastCuadre,
            type: "update",
            enable: false,
            saved: true,
          };
        } else {
          cuadreActual = {
            ...cuadreActual,
            cajaInicial: lastCuadre.cajaFinal,
            type: "new",
            enable: false,
            saved: false,
          };
        }
      } else if (dPrincipal.isBefore(dLastCuadre)) {
        // <
        if (listCuadres.length > 0) {
          cuadreActual = {
            ...listCuadres[listCuadres.length - 1],
            type: "view",
            enable: true,
            saved: true,
          };
        } else {
          cuadreActual = {
            ...cuadreActual,
            type: "view",
            enable: true,
            saved: false,
          };
        }
      } else if (dPrincipal.isAfter(dLastCuadre)) {
        // >
        cuadreActual = {
          ...cuadreActual,
          cajaInicial: lastCuadre.cajaFinal,
          type: "new",
          enable: false,
          saved: false,
        };
      }
    }

    const MovimientosNCuadre = await handleGetMovimientosNCuadre(
      datePrincipal,
      listCuadres
    );

    let { pagosNCuadre, gastosNCuadre } = MovimientosNCuadre;

    res.json({
      listCuadres: listCuadres ? listCuadres : [],
      lastCuadre: lastCuadre
        ? { ...lastCuadre, type: "update", enable: false, saved: true }
        : null,
      cuadreActual: cuadreActual,
      infoBase,
      registroNoCuadrados: {
        pagos: pagosNCuadre.length ? pagosNCuadre : [],
        gastos: gastosNCuadre.length ? gastosNCuadre : [],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el servidor: " + error.message);
  }
});

const handleGetListFechas = (date) => {
  const fechas = [];
  // Convertir la cadena de fecha en un objeto moment para la fecha de entrada
  const inputDate = moment(date, "YYYY-MM-DD");
  // Convertir la cadena de fecha en un objeto moment para la fecha actual
  const currentDate = moment().startOf("day");

  // Verificar si la fecha de entrada es de un mes y año futuros respecto a la fecha actual
  if (
    inputDate.isAfter(currentDate, "month") ||
    inputDate.year() > currentDate.year()
  ) {
    // Retornar array vacío si es futuro
    return fechas;
  }

  // Extraer el año y el mes directamente de la fecha de entrada
  const year = inputDate.year();
  const month = inputDate.month() + 1; // moment.js cuenta los meses desde 0

  // Iniciar en el primer día del mes del parámetro date
  let currentDateStartOfMonth = moment(`${year}-${month}-01`, "YYYY-MM-DD");
  // Determinar si la fecha de entrada corresponde al mes y año actual
  const isCurrentMonth =
    currentDate.year() === year && currentDate.month() + 1 === month;
  // Usar la fecha actual como última fecha si es el mes actual, de lo contrario usar el último día del mes de entrada
  const lastDate = isCurrentMonth
    ? currentDate
    : currentDateStartOfMonth.clone().endOf("month");

  while (currentDateStartOfMonth.isSameOrBefore(lastDate, "day")) {
    fechas.push(currentDateStartOfMonth.format("YYYY-MM-DD"));
    currentDateStartOfMonth.add(1, "day");
  }

  // Asegurar que no se incluyan fechas del mes siguiente
  return fechas.filter((fecha) => moment(fecha).month() === inputDate.month());
};

router.get("/get-list-cuadre/mensual/:date", async (req, res) => {
  try {
    const { date } = req.params;
    // Genera la lista de fechas para el mes dado
    const listaFechas = handleGetListFechas(date);

    const resultadosPorFecha = await Promise.all(
      listaFechas.map(async (fecha) => {
        // Para cada fecha, obtener la estructura nueva y los cuadres diarios
        const cuadreDiarios = await CuadreDiario.find({ "date.fecha": fecha });
        const listCuadres = await obtenerInformacionDetallada(cuadreDiarios);
        const MontoNCuadrados = await handleGetMovimientosNCuadre(
          fecha,
          listCuadres
        );
        const { pagosNCuadre, gastosNCuadre } = MontoNCuadrados;
        const paysNCuadrados = pagosNCuadre;
        const gastoGeneral = gastosNCuadre;

        // Procesar cada cuadre diario para esa fecha
        const cuadresTransformados = await Promise.all(
          cuadreDiarios.map(async (cuadre) => {
            // Sumar los montos de cada cuadre
            const sumaMontos = cuadre.Montos.reduce(
              (total, monto) => total + monto.total,
              0
            );
            const montoCaja = sumaMontos.toFixed(1).toString();

            // Remover el atributo Montos
            delete cuadre.Montos;

            // Agregar montoCaja
            cuadre.montoCaja = montoCaja;

            // Retornar solo los campos deseados
            return {
              _id: cuadre._id,
              cajaInicial: cuadre.cajaInicial,
              montoCaja,
              estado: cuadre.estado,
              margenError: cuadre.margenError,
              corte: cuadre.corte,
              cajaFinal: cuadre.cajaFinal,
              ingresos: cuadre.ingresos,
              egresos: cuadre.egresos,
              notas: cuadre.notas,
              infoUser: cuadre.infoUser,
            };
          })
        );

        return {
          fecha,
          cuadresTransformados,
          paysNCuadrados,
          gastoGeneral,
        };
      })
    );

    res.json(resultadosPorFecha);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el servidor: " + error.message);
  }
});

export default router;
