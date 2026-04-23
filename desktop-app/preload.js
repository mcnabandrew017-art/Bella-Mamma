const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getOrders: () => ipcRenderer.invoke('get-orders'),
    getKitchenOrders: () => ipcRenderer.invoke('get-kitchen-orders'),
    updateOrderStatus: (orderId, status) => ipcRenderer.invoke('update-order-status', orderId, status),
    getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
    onBackendReady: (callback) => ipcRenderer.on('backend-ready', (event, url) => callback(url)),
    onRefreshOrders: (callback) => ipcRenderer.on('refresh-orders', () => callback()),
    onFilterStatus: (callback) => ipcRenderer.on('filter-status', (event, status) => callback(status))
});