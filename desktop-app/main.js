const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
let backendUrl = 'http://localhost:3000';
const isDev = !app.isPackaged;

function startBackend() {
    console.log('Starting Bella Mamma backend...');
    
    let backendPath;
    if (isDev) {
        backendPath = path.join(__dirname, '..', 'backend', 'src', 'index.js');
    } else {
        backendPath = path.join(process.resourcesPath, 'backend', 'src', 'index.js');
    }
    
    if (!fs.existsSync(backendPath)) {
        console.error('Backend not found:', backendPath);
        return;
    }
    
    backendProcess = spawn('node', [backendPath], {
        cwd: path.dirname(backendPath),
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT: '3000' }
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend exited with code ${code}`);
    });

    console.log('Waiting for backend to start...');
    setTimeout(checkBackend, 3000);
}

function checkBackend() {
    http.get(`${backendUrl}/api/health`, (res) => {
        if (res.statusCode === 200) {
            console.log('Backend ready!');
            if (mainWindow) {
                mainWindow.webContents.send('backend-ready', backendUrl);
            }
        }
    }).on('error', () => {
        setTimeout(checkBackend, 1000);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        icon: isDev ? path.join(__dirname, 'icon.png') : path.join(process.resourcesPath, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'Bella Mamma - Order Manager',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Website',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => shell.openExternal(backendUrl)
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Orders',
            submenu: [
                {
                    label: 'Refresh Orders',
                    accelerator: 'F5',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('refresh-orders');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Show Pending',
                    click: () => {
                        if (mainWindow) mainWindow.webContents.send('filter-status', 'pending');
                    }
                },
                {
                    label: 'Show All',
                    click: () => {
                        if (mainWindow) mainWindow.webContents.send('filter-status', 'all');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Bella Mamma',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Bella Mamma',
                            message: 'Bella Mamma - Order Manager',
                            detail: 'Version 1.0.0\n\nA desktop app for managing pizza orders.'
                        });
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('get-orders', async () => {
    return new Promise((resolve, reject) => {
        http.get(`${backendUrl}/api/orders`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
});

ipcMain.handle('get-kitchen-orders', async () => {
    return new Promise((resolve, reject) => {
        http.get(`${backendUrl}/api/kitchen`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
});

ipcMain.handle('update-order-status', async (event, orderId, status) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ status });
        const req = http.request(`${backendUrl}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ success: true });
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
});

ipcMain.handle('get-backend-url', () => backendUrl);