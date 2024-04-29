import Servicio from "../models/portafolio/servicios.js";
import Categoria from "../models/categorias.js";
import Factura from "../models/Factura.js";
import Anular from "../models/anular.js";
import Pagos from "../models/pagos.js";
import { handleGetInfoUser } from "../routes/cuadreDiario.js";

export const handleGetInfoDelivery = async () => {
  try {
    // Consulta a la colección categorias
    const categoria = await Categoria.findOne({
      name: "Unico",
      nivel: "primario",
    });

    // Verifica si se encontró la categoría
    if (!categoria) {
      return null;
    }

    // Obtiene el _id de la categoría encontrada
    const categoriaId = categoria._id;

    // Consulta a la colección Servicio
    const servicio = await Servicio.findOne({
      idCategoria: categoriaId,
      nombre: "Delivery",
    });

    // Verifica si se encontró el servicio
    if (!servicio) {
      return null;
    }

    return servicio;
  } catch (error) {
    console.error("Error al buscar el servicio:", error);
  }
};

export const GetOrderId = async (id) => {
  try {
    // Buscar el documento por su ID
    const factura = await Factura.findById(id);

    // Verificar si se encontró el documento
    if (!factura) {
      console.log("No se encontró ninguna factura con ese ID");
      return null; // o puedes lanzar un error según tus necesidades
    }

    // Devolver el documento encontrado
    return factura;
  } catch (error) {
    console.error("Error al buscar la factura:", error);
    throw error; // puedes manejar el error según tus necesidades
  }
};

export const GetAnuladoId = async (id) => {
  try {
    // Buscar el documento por su ID
    const anulado = await Anular.findById(id);

    // Verificar si se encontró el documento
    if (!anulado) {
      console.log("No se encontró ningún registro anulado con ese ID");
      return null; // o puedes lanzar un error según tus necesidades
    }

    // Devolver el documento encontrado
    return anulado;
  } catch (error) {
    console.error("Error al buscar el registro anulado:", error);
    throw error; // puedes manejar el error según tus necesidades
  }
};

export const GetPagosIdOrden = async (idOrden) => {
  try {
    const pagosByIdOrden = await Pagos.aggregate([
      {
        $match: { idOrden: idOrden }, // Filtrar por el idOrden proporcionado
      },
      {
        $addFields: {
          idOrdenObjectId: { $toObjectId: "$idOrden" }, // Convertir idOrden a ObjectId
        },
      },
      {
        $lookup: {
          from: "facturas",
          localField: "idOrdenObjectId",
          foreignField: "_id",
          as: "factura",
        },
      },
      {
        $unwind: "$factura",
      },
      {
        $project: {
          _id: "$_id",
          idUser: "$idUser",
          idOrden: "$idOrden",
          orden: "$factura.codRecibo",
          date: "$date",
          nombre: "$factura.Nombre",
          total: "$total",
          metodoPago: "$metodoPago",
          Modalidad: "$factura.Modalidad",
          isCounted: "$isCounted",
        },
      },
    ]);

    return pagosByIdOrden.length > 0 ? pagosByIdOrden : [];
  } catch (error) {
    console.error("Error al obtener los datos por idOrden:", error);
    throw error;
  }
};

export const GetPagosId = async (idPago) => {
  try {
    // Realizar la agregación para obtener la información del pago y la factura combinada
    const pagoInfo = await Pagos.aggregate([
      {
        $addFields: {
          idPagoString: { $toString: "$_id" }, // Convertir el _id a cadena
        },
      },
      {
        $match: {
          idPagoString: idPago, // Comparar la cadena _id con idPago
        },
      },
      {
        $lookup: {
          from: "facturas",
          let: { idOrden: "$idOrden" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toObjectId: "$$idOrden" }, // Convertir $$idOrden a ObjectId
                    "$_id", // Comparar directamente el _id de la factura con el idOrden del pago
                  ],
                },
              },
            },
          ],
          as: "factura",
        },
      },
      {
        $unwind: "$factura",
      },
      {
        $project: {
          _id: "$_id",
          idUser: "$idUser",
          orden: "$factura.codRecibo",
          idOrden: "$idOrden",
          date: "$date",
          nombre: "$factura.Nombre",
          total: "$total",
          metodoPago: "$metodoPago",
          Modalidad: "$factura.Modalidad",
          isCounted: "$isCounted",
        },
      },
    ]);

    if (pagoInfo.length === 0) {
      throw new Error(
        "No se encontró ningún documento con el _id proporcionado"
      );
    }

    return {
      ...pagoInfo[0],
      infoUser: await handleGetInfoUser(pagoInfo[0].idUser),
    }; // Devolver el primer documento encontrado
  } catch (error) {
    console.error("Error al obtener los datos por _id de pago:", error);
    throw error; // Propagar el error para que sea manejado por el llamador
  }
};
