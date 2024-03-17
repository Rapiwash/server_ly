import express from "express";
import CuadreDiario from "../models/cuadreDiario.js";
import Factura from "../models/Factura.js";
import Anular from "../models/anular.js";
import Delivery from "../models/delivery.js";
import Gasto from "../models/gastos.js";
import Usuario from "../models/usuarios/usuarios.js";
import moment from "moment";

import { openingHours } from "../middleware/middleware.js";
import { GetAnuladoId, GetOrderId } from "../utils/utilsFuncion.js";
const router = express.Router();

const handleGetInfoUser = async (id) => {
  const iUser = await Usuario.findById(id).lean();

  return {
    _id: iUser._id,
    name: iUser.name,
    usuario: iUser.usuario,
    rol: iUser.rol,
  };
};

router.post("/save-cuadre", openingHours, async (req, res) => {
  const { infoCuadre, orders, deliverys, gastos } = req.body;

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

    // Actualiza los documentos de Factura en paralelo
    await Promise.all(
      orders.map(async (order) => {
        const { idOrder, idsPago } = order;

        // Encuentra el documento en la colección Factura donde _id coincide con idOrder
        const facturaToUpdate = await Factura.findOne({ _id: idOrder });

        if (facturaToUpdate) {
          // Actualiza ListPago utilizando map para crear un nuevo array
          facturaToUpdate.ListPago = facturaToUpdate.ListPago.map((pago) => {
            if (idsPago.includes(pago._id.toString())) {
              pago.idCuadre = cuadreSaved._id;
            }
            return pago;
          });

          // Guarda los cambios en el documento de Factura
          await facturaToUpdate.save();
        }
      })
    );

    // Agrega la asignación de idCuadre para Gastos
    await Promise.all(
      gastos.map(async (idGasto) => {
        await Gasto.findByIdAndUpdate(
          idGasto,
          { idCuadre: cuadreSaved._id },
          { new: true }
        );
      })
    );

    // Agrega la asignación de idCuadre para Deliverys
    await Promise.all(
      deliverys.map(async (idDelivery) => {
        await Delivery.findByIdAndUpdate(
          idDelivery,
          { idCuadre: cuadreSaved._id },
          { new: true }
        );
      })
    );

    // res.json({ ...cuadreSaved, infoUser: await handleGetInfoUser(cuadreSaved.userID), userID: undefined });
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

    // Actualiza los documentos de Factura en paralelo
    await Promise.all(
      orders.map(async (order) => {
        const { idOrder, idsPago } = order;

        // Encuentra el documento en la colección Factura donde _id coincide con idOrder
        const facturaToUpdate = await Factura.findOne({ _id: idOrder });

        if (facturaToUpdate) {
          // Actualiza ListPago utilizando map para crear un nuevo array
          facturaToUpdate.ListPago = facturaToUpdate.ListPago.map((pago) => {
            if (idsPago.includes(pago._id.toString())) {
              pago.idCuadre = cuadreUpdate._id; // Usar cuadreUpdate._id
            }
            return pago;
          });

          // Guarda los cambios en el documento de Factura
          await facturaToUpdate.save();
        }
      })
    );

    await Promise.all(
      gastos.map(async (idGasto) => {
        await Gasto.findByIdAndUpdate(idGasto, { idCuadre: cuadreUpdate._id });
      })
    );

    await Promise.all(
      deliverys.map(async (idDelivery) => {
        await Delivery.findByIdAndUpdate(idDelivery, {
          idCuadre: cuadreUpdate._id,
        });
      })
    );

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

router.get("/get-cuadre/:idUsuario/:datePrincipal", async (req, res) => {
  try {
    const { idUsuario, datePrincipal } = req.params;

    // 1. Buscar por la fecha dada.
    let listCuadres = await CuadreDiario.find({
      "date.fecha": datePrincipal,
    }).lean();

    // 2. Encontrar el último cuadre de toda la colección.
    let lastCuadre = await CuadreDiario.findOne().sort({ index: -1 }).lean();

    // 3. Enriquecer el último cuadre con la información del usuario.
    if (lastCuadre) {
      const iUser = await handleGetInfoUser(lastCuadre.userID);
      lastCuadre = {
        ...lastCuadre,
        infoUser: iUser,
        userID: undefined,
      };
    }

    // 4. Enriquecer cada elemento de listCuadres con la información del usuario.
    if (listCuadres.length > 0) {
      const userInfos = await Promise.all(
        listCuadres.map(async (cuadre) => {
          const userInfo = await handleGetInfoUser(cuadre.userID);
          return userInfo;
        })
      );

      listCuadres = listCuadres.map((cuadre, index) => {
        const iUser = userInfos[index];
        return { ...cuadre, infoUser: iUser, userID: undefined };
      });
    }

    // 5. Agregar atributo 'enable' a cada elemento de listCuadres.
    if (listCuadres.length > 0 && lastCuadre) {
      const dPrincipal = moment(datePrincipal, "YYYY-MM-DD");
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
        delivery: "",
      },
      notas: [],
      infoUser: await handleGetInfoUser(idUsuario),
    };

    let cuadreActual = infoBase;

    if (lastCuadre) {
      const dPrincipal = moment(datePrincipal, "YYYY-MM-DD");
      const dLastCuadre = moment(lastCuadre.date.fecha, "YYYY-MM-DD");
      if (listCuadres.length > 0) {
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
        } else {
          if (dPrincipal.isBefore(dLastCuadre)) {
            // <
            cuadreActual = {
              ...listCuadres[listCuadres.length - 1],
              type: "view",
              enable: true,
              saved: true,
            };
          }
        }
      } else {
        if (dPrincipal.isAfter(dLastCuadre)) {
          // >
          cuadreActual = {
            ...cuadreActual,
            cajaInicial: lastCuadre.cajaFinal,
            type: "new",
            enable: false,
            saved: false,
          };
        }
        if (dPrincipal.isBefore(dLastCuadre)) {
          // <
          cuadreActual = {
            ...cuadreActual,
            type: "view",
            enable: true,
            saved: false,
          };
        }
      }
    }

    const paysNCuadrados = await getNewStructure(datePrincipal);
    const gastoNCuadrados = await GetGastosNCuadre(datePrincipal);
    const deliveryNCuadrados = await GetDeliveriesNCuadre(datePrincipal);

    res.json({
      listCuadres: listCuadres ? listCuadres : [],
      lastCuadre: lastCuadre
        ? { ...lastCuadre, type: "update", enable: false, saved: true }
        : null,
      cuadreActual: cuadreActual,
      infoBase,
      registroNoCuadrados:
        paysNCuadrados.length > 0 ||
        gastoNCuadrados.length > 0 ||
        deliveryNCuadrados > 0
          ? {
              pagos: paysNCuadrados,
              gastos: gastoNCuadrados,
              delivery: deliveryNCuadrados,
            }
          : null,
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

const AgruparPagosByMetodo = (pagos) => {
  const resultado = {};

  pagos.forEach(({ _id, metodoPago, total, ...resto }) => {
    const clave = `${_id}-${metodoPago}`;

    if (!resultado[clave]) {
      resultado[clave] = {
        _id,
        metodoPago,
        total,
        ...resto,
      };
    } else {
      resultado[clave].total += total;
    }
  });

  return Object.values(resultado).map(({ idPago, ...resto }) => resto);
};

const GetPagosNCuadre = async (orders, fechaPrincipal) => {
  const pagos = [];
  let index = 0;

  for (const order of orders) {
    if (order.Pago !== "Pendiente") {
      for (const pago of order.ListPago) {
        const esPagoValido =
          (order.modeRegistro !== "antiguo" &&
            pago.date.fecha === fechaPrincipal) ||
          (order.modeRegistro === "antiguo" &&
            pago.date.fecha !== order.dateRecepcion.fecha &&
            pago.date.fecha === fechaPrincipal);

        if (esPagoValido) {
          const iUser = await Usuario.findById(pago.idUser).exec();

          if (iUser) {
            const infoUsuario = iUser.toObject();
            pagos.push({
              index: index++,
              _id: order._id,
              idPago: pago._id,
              codRecibo: order.codRecibo,
              Modalidad: order.Modalidad,
              fecha: pago.date.fecha,
              hora: pago.date.hora,
              estadoPrenda: order.estadoPrenda,
              metodoPago: pago.metodoPago,
              Nombre: order.Nombre,
              total: pago.total,
              infoUser: {
                _id: infoUsuario._id.toString(),
                name: infoUsuario.name,
                rol: infoUsuario.rol,
              },
              idCuadre: pago.idCuadre,
            });
          }
        }
      }
    }
  }

  // Esperar a que todos los pagos sean procesados
  // La siguiente línea asume que tienes una función AgruparPagosByMetodo que procesa los pagos no cuadrados
  const pagosNoCuadrados = pagos.filter(
    (pago) => pago.idCuadre === "" && pago.estadoPrenda !== "anulado"
  );
  const res = await AgruparPagosByMetodo(pagosNoCuadrados);

  return res;
};

async function getNewStructure(dateCuadre) {
  const facturas = await Factura.find({
    Pago: { $ne: "Pendiente" },
    "ListPago.date.fecha": dateCuadre,
  });

  const paysNCuadrados = await GetPagosNCuadre(facturas, dateCuadre);

  return paysNCuadrados;
}

const GetGastosNCuadre = async (dateCuadre) => {
  const gastosNCuadrados = await Gasto.find({
    fecha: dateCuadre,
    idCuadre: "",
  });
  // Mapear cada gasto a una nueva estructura incluyendo la información del usuario
  const gastosConInfoUsuario = await Promise.all(
    gastosNCuadrados.map(async (gasto) => {
      // Buscar información del usuario correspondiente al gasto
      const usuario = await Usuario.findById(gasto.idUser).exec();

      // Transformar la información a la estructura deseada
      return {
        _id: gasto._id,
        fecha: gasto.fecha,
        hora: gasto.hora,
        descripcion: gasto.descripcion,
        monto: gasto.monto,
        infoUser: {
          _id: usuario._id,
          name: usuario.name,
          rol: usuario.rol,
        },
      };
    })
  );

  return gastosConInfoUsuario;
};

const GetDeliveriesNCuadre = async (dateCuadre) => {
  // Buscar deliveries sin cuadre para la fecha especificada
  const deliveriesNCuadrados = await Delivery.find({
    fecha: dateCuadre,
    idCuadre: "",
  });

  // Mapear cada delivery a una nueva estructura incluyendo la información del usuario
  const deliveriesConInfoUsuario = await Promise.all(
    deliveriesNCuadrados.map(async (delivery) => {
      const orderByDelivery = GetOrderId(delivery.idCliente);

      if (orderByDelivery?.estadoPrenda === "anulado") {
        const infoAnulacion = await GetAnuladoId(orderByDelivery._id);

        if (
          infoAnulacion.fecha === delivery.fecha &&
          delivery.idCuadre === ""
        ) {
          return null; // Omitir este delivery
        }
      }
      // Buscar información del usuario correspondiente al delivery
      const usuario = await Usuario.findById(delivery.idUser).exec();

      // Transformar la información a la estructura deseada
      return {
        _id: delivery._id,
        fecha: delivery.fecha,
        hora: delivery.hora,
        descripcion: delivery.descripcion,
        monto: delivery.monto,
        infoUser: {
          _id: usuario._id,
          name: usuario.name,
          rol: usuario.rol,
        },
      };
    })
  );

  // Filtrar los deliveries para eliminar los que se han omitido
  const deliveriesFiltrados = deliveriesConInfoUsuario.filter(
    (delivery) => delivery !== null
  );

  return deliveriesFiltrados;
};

router.get("/get-list-cuadre/mensual/:date", async (req, res) => {
  try {
    const { date } = req.params;
    // Genera la lista de fechas para el mes dado
    const listaFechas = handleGetListFechas(date);

    const resultadosPorFecha = await Promise.all(
      listaFechas.map(async (fecha) => {
        // Para cada fecha, obtener la estructura nueva y los cuadres diarios
        const paysNCuadrados = await getNewStructure(fecha);
        const cuadreDiarios = await CuadreDiario.find({ "date.fecha": fecha });
        const gastoNCuadrados = await GetGastosNCuadre(fecha);
        const deliveryNCuadrados = await GetDeliveriesNCuadre(fecha);
        const gastoGeneral = [...gastoNCuadrados, ...deliveryNCuadrados];

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

            // Obtener información del usuario
            const userInfo = await Usuario.findOne(
              { _id: cuadre.userID },
              { name: 1, _id: 1, rol: 1 }
            );

            // Reemplazar userID con infoUser
            cuadre.infoUser = userInfo;
            delete cuadre.userID;

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
