import Servicio from "../models/portafolio/servicios.js";
import Categoria from "../models/categorias.js";
import Factura from "../models/Factura.js";
import Anular from "../models/anular.js";

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
