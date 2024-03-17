import express from "express";
import Negocio from "../models/negocio.js";

const router = express.Router();

router.get("/get-info-negocio", async (req, res) => {
  try {
    // Intenta encontrar el único registro en la colección
    const negocio = await Negocio.findOne();

    if (negocio) {
      // Si se encuentra un registro, responde con ese registro
      return res.json(negocio);
    } else {
      // Si no se encuentra ningún registro, crea uno en base al modelo y responde con él
      const nuevoNegocio = new Negocio({
        name: "Haibor",
        direccion: "av. unknown 123",
        numero: {
          info: "123456789",
          state: true,
        },
        estado: true,
        itemsAtajos: [],
        horario: {
          dias: [1, 2, 3, 4, 5, 6],
          horas: {
            inicio: "08:00",
            fin: "18:00",
          },
        },
      });

      await nuevoNegocio.save();

      return res.json(nuevoNegocio);
    }
  } catch (error) {
    // Manejo de errores
    console.error(error);
    return res.status(500).json({ error: "Error en el servidor" });
  }

  // setTimeout(() => {
  //   return res.status(500).json({ error: 'Error en el servidor' });
  // }, 10000);
});

router.put("/update-info-negocio", async (req, res) => {
  try {
    // Intenta encontrar el único registro en la colección
    const negocio = await Negocio.findOne();

    if (!negocio) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    // Actualiza los campos del registro con los datos proporcionados en la solicitud
    Object.assign(negocio, req.body);

    // Guarda los cambios en la base de datos
    await negocio.save();
    return res.json(negocio);
  } catch (error) {
    // Manejo de errores
    console.error(error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;
