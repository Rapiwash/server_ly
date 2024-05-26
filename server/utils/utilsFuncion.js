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

export const GetPagoMasDetalleOrden = async (idPago) => {
  try {
    const pagoInfo = await Pagos.findById(idPago);

    const factura = await Factura.findById(pagoInfo.idOrden);

    const detallePago = {
      _id: pagoInfo._id,
      idUser: pagoInfo.idUser,
      orden: factura.codRecibo,
      idOrden: pagoInfo.idOrden,
      date: pagoInfo.date,
      nombre: factura.Nombre,
      total: pagoInfo.total,
      metodoPago: pagoInfo.metodoPago,
      Modalidad: factura.Modalidad,
      isCounted: pagoInfo.isCounted,
      infoUser: await handleGetInfoUser(pagoInfo.idUser),
    };
    return detallePago;
  } catch (error) {
    console.error("Error al obtener los datos por _id de pago:", error);
    throw error; // Propagar el error para que sea manejado por el llamador
  }
};

export const GetListPagosMasDetalleOrden = async (idOrden) => {
  try {
    // Buscar la factura por su id
    const factura = await Factura.findById(idOrden);

    if (!factura) {
      throw new Error("Factura no encontrada");
    }

    // Obtener los IDs de los pagos asociados a la factura
    const pagosIds = factura.listPago;

    // Buscar los detalles de cada pago usando los IDs
    const ListDetallePagos = await Promise.all(
      pagosIds.map(async (pagoId) => {
        const pago = await Pagos.findById(pagoId);
        if (!pago) {
          throw new Error(`Pago con ID ${pagoId} no encontrado`);
        }
        const infoUser = await handleGetInfoUser(pago.idUser);
        return {
          _id: pago._id,
          idUser: pago.idUser,
          orden: factura.codRecibo,
          idOrden: pago.idOrden,
          date: pago.date,
          nombre: factura.Nombre,
          total: pago.total,
          metodoPago: pago.metodoPago,
          Modalidad: factura.Modalidad,
          isCounted: pago.isCounted,
          infoUser: infoUser,
        };
      })
    );

    return ListDetallePagos;
  } catch (error) {
    console.error(
      "Error al obtener los detalles de pago por id de orden:",
      error
    );
    throw error;
  }
};
