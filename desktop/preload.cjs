// Puente seguro (contextIsolation): el renderer pide acciones de IA; los tokens nunca cruzan.
const { contextBridge, ipcRenderer, webUtils } = require("electron");
contextBridge.exposeInMainWorld("avcDesktop", {
  version: process.env.AVC_APP_VERSION || "",
  openExternal: (url) => ipcRenderer.invoke("open-external", String(url)),
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    read: (id) => ipcRenderer.invoke("projects:read", id),
    write: (meta, data) => ipcRenderer.invoke("projects:write", meta, data),
    remove: (id) => ipcRenderer.invoke("projects:remove", id),
  },
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || "";
    } catch {
      return "";
    }
  },
  viewer: {
    displays: () => ipcRenderer.invoke("viewer:displays"),
    moveTo: (id, fullscreen) => ipcRenderer.invoke("viewer:move", id, Boolean(fullscreen)),
    toggleFullscreen: () => ipcRenderer.invoke("viewer:fullscreen"),
  },
  checkUpdates: () => ipcRenderer.invoke("updates:check"),
  showItemInFolder: (p) => ipcRenderer.invoke("file:show", String(p)),
  feedCache: (op, text) => ipcRenderer.invoke("feed:cache", op, text),
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
