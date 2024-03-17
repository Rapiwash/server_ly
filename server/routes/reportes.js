import express from "express";
import Factura from "../models/Factura.js";
import Delivery from "../models/delivery.js";
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
    const facturas = await Factura.find({
      "dateRecepcion.fecha": {
        $gte: fechaInicial.format("YYYY-MM-DD"),
        $lte: fechaFinal.format("YYYY-MM-DD"),
      },
      estadoPrenda: { $ne: "anulado" }, // EstadoPrenda debe ser distinto de "anulado"
    });

    res.json([...facturas]);
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
    const facturas = await Factura.find({
      estadoPrenda: "pendiente",
      estado: "registrado",
      location: 1,
    });

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
