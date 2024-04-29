import express from "express";
import Producto from "../../models/portafolio/productos.js";
import categorias from "../../models/categorias.js";
import Servicio from "../../models/portafolio/servicios.js";
import Factura from "../../models/Factura.js";
import moment from "moment";

const router = express.Router();

router.get("/get-informacion/:fecha", async (req, res) => {
  try {
    const date = req.params.fecha;

    // Validar que se haya proporcionado una fecha
    if (!date) {
      return res
        .status(400)
        .json({ mensaje: "Se requiere proporcionar una fecha" });
    }

    const fechaFormato = moment(date, "YYYY-MM-DD");
    const mes = fechaFormato.month() + 1;
    const año = fechaFormato.year();

    const inicioMes = moment(`${año}-${mes}-01`, "YYYY-MM-DD");
    const finMes = moment(inicioMes).endOf("month");

    // Obtener productos
    const productos = await Producto.find(
      {},
      "nombre simboloMedida idCategoria _id"
    ).lean();
    // Asignar tipo 'productos' a cada producto
    const iProductos = productos.map((producto) => ({
      ...producto,
      tipo: "productos",
    }));

    // Obtener servicios
    const servicios = await Servicio.find(
      {},
      "nombre simboloMedida idCategoria _id"
    ).lean();
    // Asignar tipo 'servicios' a cada servicio
    const iServicios = servicios.map((servicio) => ({
      ...servicio,
      tipo: "servicios",
    }));

    // Unificar productos y servicios
    const iPortafolio = [...iProductos, ...iServicios];

    // Obtener todas las categorías
    const iCategorias = await categorias.find({}, "name _id");

    const handleGetCategoria = (id) => {
      const dataCat = iCategorias.find((cat) => String(cat._id) === id);
      return {
        id: String(dataCat._id),
        name: dataCat.name,
      };
    };

    // Obtener facturas
    const facturas = await Factura.find({
      "dateRecepcion.fecha": {
        $gte: inicioMes.format("YYYY-MM-DD"),
        $lte: finMes.format("YYYY-MM-DD"),
      },
    });

    // Objeto para almacenar la información combinada por _id
    const combinedInfoMap = {};

    // Iterar sobre cada factura
    for (const factura of facturas) {
      // Iterar sobre los items de la factura
      for (const item of factura.Items) {
        // Encontrar el producto o servicio correspondiente en el array unificado
        const elemento = iPortafolio.find(
          (el) => el._id.toString() === item.identificador
        );

        // Si se encontró el elemento, agregar información combinada al mapa
        if (elemento) {
          const id = elemento._id.toString();
          // Inicializar combinedInfoMap[id] si es null
          if (!combinedInfoMap[id]) {
            combinedInfoMap[id] = {
              nombre: elemento.nombre,
              _id: elemento._id,
              categoria: handleGetCategoria(elemento.idCategoria),
              tipo: elemento.tipo,
              cantidad: 0,
              simboloMedida: elemento.simboloMedida, // Corregido el nombre del campo
              montoGenerado: 0,
            };
          }
          // Asegurarse de que item.cantidad y item.total sean numéricos antes de sumarlos
          const cantidad = Number(item.cantidad);
          const total = Number(item.total);
          if (!isNaN(cantidad) && !isNaN(total)) {
            // Incrementar las cantidades y totales
            combinedInfoMap[id].cantidad += cantidad;
            combinedInfoMap[id].montoGenerado += total;
          } else {
            console.log("Cantidad no es un valor numérico válido:", cantidad);
            console.log("Total no es un valor numérico válido:", total);
            console.log("ID del elemento:", id);
            console.log("ID de la factura:", factura._id);
          }
        }
      }
    }

    // Agregar elementos de iPortafolio que no se encontraron en las facturas
    for (const elemento of iPortafolio) {
      const id = elemento._id.toString();
      if (!combinedInfoMap[id]) {
        combinedInfoMap[id] = {
          nombre: elemento.nombre,
          _id: elemento._id,
          tipo: elemento.tipo,
          categoria: handleGetCategoria(elemento.idCategoria),
          cantidad: 0,
          simboloMedida: elemento.simboloMedida, // Corregido el nombre del campo
          montoGenerado: 0,
        };
      }
    }

    // Convertir el mapa a un arreglo de objetos
    const combinedInfo = Object.values(combinedInfoMap);

    res.json(combinedInfo);
  } catch (error) {
    console.error("Error al obtener la información combinada:", error);
    res
      .status(500)
      .json({ mensaje: "Error al obtener la información combinada" });
  }
});
export default router;
