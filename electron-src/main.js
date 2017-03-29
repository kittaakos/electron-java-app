const {app, BrowserWindow, Menu, MenuItem} = require('electron');

const isWindows = (function _isWindows() {
    if (typeof navigator !== 'undefined') {
        if (navigator.userAgent && navigator.userAgent.indexOf('Windows') >= 0) {
            return true;
        }
    }
    if (typeof process !== 'undefined') {
        return (process.platform === 'win32');
    }
    return false;
})();

function createServerProcess() {
    const childProcess = require('child_process');
    const cwd = './electron-vaadin/bin';
    if (isWindows) {
        return childProcess.spawn('cmd.exe', ['/c', 'electron-vaadin.bat'], { cwd });
    } else {
        const path = require('path').resolve(cwd, 'electron-vaadin');
        require('fs').chmodSync(path, '777');
        return childProcess.execFile(path, (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                throw err;
            }
        });
    }
}

let mainWindow = null;
let serverProcess = null;

// Provide API for web application
global.callElectronUiApi = function(args) {
    console.log('Electron called from web app with args "' + args + '"');

    if (args && args[0] == 'exit') {
        console.log('Kill server process');

        const kill = require('tree-kill');
        kill(serverProcess.pid, 'SIGTERM', function (err) {
            console.log('Server process killed');

            serverProcess = null;
            mainWindow.close();
        });
    }
};

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    serverProcess = createServerProcess();
    serverProcess.stdout.on('data', function (data) {
        console.log('Server: ' + data);
    });

    console.log("Server PID: " + serverProcess.pid);

    const requestPromise = require('request-promise');
    let appUrl = 'http://localhost:8080';

    const openWindow = function () {
        mainWindow = new BrowserWindow({
            title: 'TODO List - Electron Vaadin application',
            width: 500,
            height: 768
        });

        const menuTemplate = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        click: function() {
                            mainWindow.webContents.executeJavaScript("appMenuItemTriggered('Exit');");
                        }
                    }
                ]
            },
            {
                label: 'About',
                click: function() {
                    mainWindow.webContents.executeJavaScript("appMenuItemTriggered('About');");
                }
            }
        ];
        const menu = Menu.buildFromTemplate(menuTemplate);
        mainWindow.setMenu(menu);
        mainWindow.loadURL(appUrl);

        // uncomment to show debug tools
        // mainWindow.webContents.openDevTools();

        mainWindow.on('closed', function () {
            mainWindow = null;
        });

        mainWindow.on('close', function (e) {
            if (serverProcess) {
                e.preventDefault();

                mainWindow.webContents.executeJavaScript("appWindowExit();");
            }
        });
    };

    const startUp = function () {
        requestPromise(appUrl)
            .then(function (htmlString) {
                console.log('Server started!');
                openWindow();
            })
            .catch(function (err) {
                console.log('Waiting for the server start...');
                startUp();
            });
    };

    startUp();
});