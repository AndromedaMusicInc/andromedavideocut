// Puente seguro (contextIsolation): el renderer pide acciones de IA; los tokens nunca cruzan.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("avcDesktop", {
  version: process.env.AVC_APP_VERSION || "",
  openExternal: (url) => ipcRenderer.invoke("open-external", String(url)),
  ai: {
    status: () => ipcRenderer.invoke("ai:status"),
    login: () => ipcRenderer.invoke("ai:login"),
    deviceStart: () => ipcRenderer.invoke("ai:device-start"),
    deviceWait: () => ipcRenderer.invoke("ai:device-wait"),
    cancel: () => ipcRenderer.invoke("ai:cancel"),
    logout: () => ipcRenderer.invoke("ai:logout"),
    request: (init) => ipcRenderer.invoke("ai:request", init),
    download: (url) => ipcRenderer.invoke("ai:download", String(url)),
  },
});
