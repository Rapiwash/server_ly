import express from "express";
import Factura from "../models/Factura.js";
import moment from "moment";
import "moment-timezone";
import Pagos from "../models/pagos.js";

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

    // Consultar las órdenes dentro del rango de fechas y estadoPrenda distinto de "anulado"
    const ordenes = await Factura.find({
      "dateRecepcion.fecha": {
        $gte: fechaInicial.format("YYYY-MM-DD"),
        $lte: fechaFinal.format("YYYY-MM-DD"),
      },
      estadoPrenda: { $ne: "anulado" },
    }).lean();

    // Obtener los IDs de todos los pagos de las órdenes
    const idsPagos = ordenes.flatMap((orden) => orden.listPago);

    // Consultar todos los pagos de las órdenes
    const pagos = await Pagos.find({ _id: { $in: idsPagos } }).lean();

    // Crear un mapa de pagos por ID de orden para un acceso más rápido
    const pagosPorOrden = pagos.reduce((acc, pago) => {
      if (!acc[pago.idOrden]) {
        acc[pago.idOrden] = [];
      }
      acc[pago.idOrden].push(pago);
      return acc;
    }, {});

    // Combinar las órdenes con sus respectivos pagos
    const ordenesMensual = ordenes.map((orden) => ({
      ...orden,
      ListPago: pagosPorOrden[orden._id] || [],
    }));

    res.status(200).json(ordenesMensual);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo generar el reporte EXCEL" });
  }
});

router.get("/get-reporte-pendientes", async (req, res) => {
  try {
    const facturas = await Factura.find({
      estadoPrenda: "pendiente",
      estado: "registrado",
      location: 1,
    }).lean();

    // Array para almacenar las promesas de obtener los pagos
    const pagosPromises = facturas.map(async (factura) => {
      if (factura.listPago.length > 0) {
        // Buscar los pagos relacionados con la factura
        const pagos = await Pagos.find({
          _id: { $in: factura.listPago },
        }).lean();

        // Transformar la lista de pagos en detallesPago
        const ListPago = pagos.map((pago) => ({
          _id: pago._id,
          idUser: pago.idUser,
          idOrden: pago.idOrden,
          orden: factura.codRecibo,
          date: pago.date,
          nombre: factura.Nombre,
          total: pago.total,
          metodoPago: pago.metodoPago,
          Modalidad: factura.Modalidad,
        }));

        return { ...factura, ListPago };
      } else {
        return { ...factura, ListPago: [] };
      }
    });

    // Resolver todas las promesas de pagos
    const facturasPendientes = await Promise.all(pagosPromises);

    res.json(facturasPendientes);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "No se pudo obtener lista de ordenes pendientes" });
  }
});

export default router;
