import express from "express";
import Factura from "../models/Factura.js";
import Gasto from "../models/gastos.js";
import Usuario from "../models/usuarios/usuarios.js";
import moment from "moment";
import "moment-timezone";
import { GetAnuladoId, GetOrderId } from "../utils/utilsFuncion.js";

const router = express.Router();

router.get("/get-reporte-mensual", async (req, res) => {
  const { mes, anio } = req.query;

  // Validar que los parámetros mes y anio sean válidos
  if (!mes || !anio) {
    return res
      .status(400)
      .json({ mensaje: "Los parámetros mes y año son requeridos." });
  }

  try {
    // Construir fechas de inicio y fin del mes
    const fechaInicial = moment(`${anio}-${mes}-01`, "YYYY-MM");
    const fechaFinal = fechaInicial.clone().endOf("month");

    // Consultar facturas en ese rango de fechas y con estadoPrenda no anulado
    const ordenes = await Factura.aggregate([
      {
        $match: {
          "dateRecepcion.fecha": {
            $gte: fechaInicial.format("YYYY-MM-DD"),
            $lte: fechaFinal.format("YYYY-MM-DD"),
          },
          estadoPrenda: { $ne: "anulado" }, // EstadoPrenda debe ser distinto de "anulado"
        },
      },
      {
        $lookup: {
          from: "pagos", // Nombre de la colección de pagos
          localField: "_id", // Campo de la factura que se usará para la unión
          foreignField: "idOrden", // Campo en la colección de pagos que se relaciona con la factura
          as: "ListPago", // Nombre del campo donde se almacenarán los pagos relacionados
        },
      },
      {
        $addFields: {
          ListPagoIds: { $toString: "$_id" }, // Convertir el _id de la factura a cadena
        },
      },
      {
        $lookup: {
          from: "pagos", // Nombre de la colección de pagos
          localField: "ListPagoIds", // Campo de la factura convertido a cadena
          foreignField: "idOrden", // Campo en la colección de pagos que se relaciona con la factura
          as: "ListPago", // Nombre del campo donde se almacenarán los pagos relacionados
        },
      },
      {
        $unset: "ListPagoIds", // Eliminar el campo temporal ListPagoIds después de la unión
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

    res.status(200).json(ordenes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo Generar reporte EXCEL" });
  }
});

router.get("/get-reporte-anual", async (req, res) => {
  const { anio } = req.query;

  // Validar que el parámetro anio sea válido
  if (!anio) {
    return res.status(400).json({ error: "El parámetro anio es requerido." });
  }

  try {
    // Crear un array para almacenar los resultados por mes
    const reporteAnual = [];

    for (let mes = 1; mes <= 12; mes++) {
      const fechaInicial = moment(`${anio}-${mes}-01`, "YYYY-MM-DD");
      const fechaFinal = fechaInicial.clone().endOf("month");

      // Consultar facturas en ese rango de fechas
      const facturas = await Factura.find({
        "dateRecepcion.fecha": {
          $gte: fechaInicial.format("YYYY-MM-DD"),
          $lte: fechaFinal.format("YYYY-MM-DD"),
        },
      });

      // Contar la cantidad de registros para cada Modalidad
      const conteoTienda = facturas.filter(
        (factura) => factura.Modalidad === "Tienda"
      ).length;
      const conteoDelivery = facturas.filter(
        (factura) => factura.Modalidad === "Delivery"
      ).length;

      // Agregar los resultados al array de reporteAnual
      reporteAnual.push({
        mes: mes, // Puedes cambiar esto si prefieres nombres de mes en lugar de números
        tienda: conteoTienda,
        delivery: conteoDelivery,
      });
    }

    res.json(reporteAnual);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Función para calcular la diferencia en días entre dos fechas
function dayDifference(fecha1, fecha2) {
  const momentFecha1 = moment(fecha1, "YYYY-MM-DD");
  const momentFecha2 = moment(fecha2, "YYYY-MM-DD");
  return momentFecha2.diff(momentFecha1, "days");
}

router.get("/get-reporte-pendientes", async (req, res) => {
  try {
    // Obtener la fecha actual en formato "YYYY-MM-DD"
    const fechaActual = moment().format("YYYY-MM-DD HH:mm:ss");

    // Consultar facturas que cumplan con las condiciones
    const facturas = await Factura.aggregate([
      {
        $match: {
          estadoPrenda: "pendiente",
          estado: "registrado",
          location: 1, // Agregar esta condición para el campo location igual a 1
        },
      },
      {
        $lookup: {
          from: "pagos", // Nombre de la colección de pagos
          localField: "_id", // Campo de la factura que se usará para la unión
          foreignField: "idOrden", // Campo en la colección de pagos que se relaciona con la factura
          as: "ListPago", // Nombre del campo donde se almacenarán los pagos relacionados
        },
      },
      {
        $addFields: {
          ListPagoIds: { $toString: "$_id" }, // Convertir el _id de la factura a cadena
        },
      },
      {
        $lookup: {
          from: "pagos", // Nombre de la colección de pagos
          localField: "ListPagoIds", // Campo de la factura convertido a cadena
          foreignField: "idOrden", // Campo en la colección de pagos que se relaciona con la factura
          as: "ListPago", // Nombre del campo donde se almacenarán los pagos relacionados
        },
      },
      {
        $unset: "ListPagoIds", // Eliminar el campo temporal ListPagoIds después de la unión
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
      {
        $project: {
          // Proyecta los campos de las facturas junto con el campo ListPago creado
          dateCreation: 1,
          codRecibo: 1,
          dateRecepcion: 1,
          Modalidad: 1,
          Nombre: 1,
          Items: 1,
          celular: 1,
          direccion: 1,
          datePrevista: 1,
          dateEntrega: 1,
          descuento: 1,
          estadoPrenda: 1,
          estado: 1,
          index: 1,
          dni: 1,
          subTotal: 1,
          totalNeto: 1,
          cargosExtras: 1,
          factura: 1,
          modeRegistro: 1,
          notas: 1,
          modoDescuento: 1,
          gift_promo: 1,
          location: 1,
          attendedBy: 1,
          lastEdit: 1,
          typeRegistro: 1,
          ListPago: 1,
        },
      },
    ]);

    // Filtrar las facturas que cumplen con la diferencia de días
    const facturasPendientes = facturas.filter((factura) => {
      const dDifference = dayDifference(
        factura.dateRecepcion.fecha,
        fechaActual
      );
      return dDifference > -1;
    });

    res.json(facturasPendientes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "No se pudo obtener lista de ordenes pendientes" });
  }
});

router.get("/get-reporte-egresos", async (req, res) => {
  const { mes, anio } = req.query;

  // Validar que los parámetros mes y anio sean válidos
  if (!mes || !anio) {
    return res
      .status(400)
      .json({ mensaje: "Los parámetros mes y año son requeridos." });
  }

  try {
    // Construir fechas de inicio y fin del mes
    const fechaInicial = moment(`${anio}-${mes}-01`, "YYYY-MM");
    const fechaFinal = fechaInicial.clone().endOf("month");

    // Consultar facturas en ese rango de fechas y con estadoPrenda no anulado
    const iGastos = await Gasto.find({
      fecha: {
        $gte: fechaInicial.format("YYYY-MM-DD"),
        $lte: fechaFinal.format("YYYY-MM-DD"),
      },
    });

    // Consultar facturas en ese rango de fechas y con estadoPrenda no anulado
    const iDelivery = await Delivery.find({
      fecha: {
        $gte: fechaInicial.format("YYYY-MM-DD"),
        $lte: fechaFinal.format("YYYY-MM-DD"),
      },
    });

    // Mapear cada delivery a una nueva estructura incluyendo la información del usuario
    const deliveriesValidos = await Promise.all(
      iDelivery.map(async (delivery) => {
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
          id: delivery._id,
          tipo: "Delivery",
          fecha: delivery.fecha,
          hora: delivery.hora,
          descripcion: `${delivery.name} Orden${delivery.descripcion}`,
          monto: delivery.monto,
          infoUser: {
            _id: usuario._id,
            name: usuario.name,
            rol: usuario.rol,
          },
        };
      })
    );

    // Mapear cada gasto a una nueva estructura incluyendo la información del usuario
    const gastosValidos = await Promise.all(
      iGastos.map(async (gasto) => {
        // Buscar información del usuario correspondiente al gasto
        const usuario = await Usuario.findById(gasto.idUser).exec();

        // Transformar la información a la estructura deseada
        return {
          id: gasto._id,
          tipo: "Gasto",
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

    // Combinar entregas y gastos en un solo array
    const reporteCompleto = [...deliveriesValidos, ...gastosValidos];

    // Ordenar el array por fecha y hora en orden ascendente
    reporteCompleto.sort((a, b) => {
      const fechaA = moment(`${a.fecha} ${a.hora}`, "YYYY-MM-DD HH:mm");
      const fechaB = moment(`${b.fecha} ${b.hora}`, "YYYY-MM-DD HH:mm");
      return fechaA.diff(fechaB);
    });
    res.json(reporteCompleto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo Generar reporte EXCEL" });
  }
});

export default router;
