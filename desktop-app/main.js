const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;
let backendUrl = 'http://localhost:3000';

const START_DELAY = 3000;

function startBackend() {
    console.log('Starting backend server...');
    
    backendProcess = spawn('node', ['backend/src/index.js'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });

    console.log('Waiting for backend to start...');
    setTimeout(() => {
        checkBackend();
    }, START_DELAY);
}

function checkBackend() {
    http.get(backendUrl, (res) => {
        if (res.statusCode === 200) {
            console.log('Backend is running at', backendUrl);
            mainWindow.webContents.send('backend-ready', backendUrl);
        }
    }).on('error', () => {
        console.log('Backend not ready yet, retrying...');
        setTimeout(checkBackend, 1000);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'Bella Mamma - Order Manager'
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Website',
                    click: () => {
                        require('electron').shell.openExternal(backendUrl);
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Orders',
            submenu: [
                {
                    label: 'Refresh Orders',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('refresh-orders');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
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
        }).on('error', reject);
    });
});

ipcMain.handle('update-order-status', async (event, orderId, status) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ status });
        const req = http.request(`${backendUrl}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => resolve(JSON.parse(responseData)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
});

ipcMain.handle('get-backend-url', () => backendUrl);
