// Solo pruebas: "abre" la URL siguiendo redirecciones, como haría el navegador tras aprobar.
module.exports = async (url) => {
  if (process.env.AVC_TEST_BROWSER === "device") return; // en device-code el usuario aprueba aparte
  try { await fetch(url, { redirect: "follow" }); } catch {}
};
