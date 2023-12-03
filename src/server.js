const express = require('express');
const serveIndex = require('serve-index');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const SQL = require('./sql.js');
const createMcServerTerminal = require('./createMcServerTerminal.js');

/**
 * @type {Map<string, createMcServerTerminal>}
 */
module.exports.cmds = new Map();

module.exports.sql = new SQL({
    host: "192.168.1.1",
    user: "user",
    password: "password",
    database: "mchost",
});

module.exports.app = express();
module.exports.server = http.createServer(this.app);

/**
 * @type {socketio.Server}
 */
module.exports.io = socketio(this.server);

module.exports.PORT = process.env.PORT || 8080;

this.app.use('/ftp', express.static('servers'), serveIndex('servers', {icons:true}));
this.app.use(express.json());
this.app.use(cookieParser());
this.app.use(session({
    secret: 'SHHISSECRETXDTESTI',
}));

/**
 * @param {'index' | 'login' | 'server' | 'consola'} page
 * @param {string} extension
 * @returns {string}
 */
module.exports.getPage = (page, extension = null) => {
    return path.join(__dirname, `../pages/${page}${extension === null ? '.html' : extension}`);
};


/**
 * @param {any} cookie
 * @param {express.Response} res
 * @returns {boolean}
 */
 module.exports.isLoged = (cookie, res) => {
    if(!cookie) {
        res.redirect('/login');
        return false;
    };
    if(cookie === false) {
        res.redirect('/login');
        return false;
    };
    return true;
};

//app.use(express.static(path.join(__dirname, 'pages')));

this.app.get('/login', async (req, res) => {
    if(req.query.exit && req.query.exit == "true") {
        req.session.isloged = false;
        req.session.user = false;
    };
    if(req.session.isloged) {
        res.redirect('/');
        return;
    };
    if(req.session.isloged === true) {
        res.redirect('/');
        return;
    };
    res.sendFile(this.getPage('login'));
});

this.app.get('/', async (req, res) => {
    if(this.isLoged(req.session.isloged, res) == false) {
        return;
    };
    res.sendFile(this.getPage('index'));
});

this.app.get('/servers/:server', async (req, res) => {
    if(this.isLoged(req.session.isloged, res) == false) {
        return;
    };
    res.sendFile(this.getPage('server'));
});

this.app.get('/servers/:server/consola', async (req, res) => {
    if(this.isLoged(req.session.isloged, res) == false) {
        return;
    };
    res.sendFile(this.getPage('consola'));
});

this.io.on('connection', async (socket) => {
    console.log(`Se conecto el cliente: ${socket.id}, con la ip: ${socket.handshake.address.replace('::ffff:', '')}`);

    socket.on('start', async (servername) => {
        if(this.cmds.has(servername)) {
            return;
        };

        this.cmds.set(servername, new createMcServerTerminal(path.join(__dirname, `../servers/${servername}/`), servername, this.io));
    });

    socket.on('cmd', async ({name, cmd}) => {
        if(!this.cmds.has(name)) {
            return;
        };
        this.cmds.get(name).send(cmd);
    });
});

module.exports.start = () => {
    this.server.listen(this.PORT, async () => {
        console.log(`Server running in http://localhost:${this.PORT}`)
    });
};

module.exports.stop = () => {
    this.server.close();
};

this.app.post('/login', async (req, res) => {
    if(req.query.exit && req.query.exit == "true") {
        req.session.isloged = false;
        req.session.user = false;
    };
    var user = req.body.user;
    var pass = req.body.pass;
    
    if(this.sql.have(user) && pass === this.sql.get(user).pass) {
        req.session.isloged = true;
        req.session.user = user;
        res.send(true);
    } else {
        res.send(false);
    };
});

this.app.get('/api/servers', async (req, res) => {
    const dirs = fs.readdirSync(path.join(__dirname, '../servers'));
    var tosend = [];
    for(var i = 0; i < dirs.length; i++) {
        tosend.push({name: dirs[i]});
    };
    res.send(JSON.stringify(tosend));
});

this.app.get('/api/server/:server', async (req, res) => {
    //const dirs = fs.readdirSync(path.join(__dirname, '../servers'));
    const info = require(path.join(__dirname, `../servers/${req.params.server}/info.json`));
    var tosend = {
        name: req.params.server,
        special: info,
        propetiles: createMcServerTerminal.getServerPropetiles(req.params.server),
    };
    res.send(JSON.stringify(tosend));
});

this.app.get('/api/server/:server/files', async (req, res) => {
    var toread = path.join(__dirname, `../servers/${req.params.server}/${req.query.d === undefined ? '' : req.query.d.replace(/\.\.\//g, '')}`);
    const files = fs.readdirSync(toread);
    var tosend = {
        name: req.params.server,
        files: [],
        dirs: [],
    };
    for(const file of files) {
        var i = fs.lstatSync(path.join(__dirname, `../servers/${req.params.server}/${req.query.d === undefined ? '' : req.query.d.replace(/\.\.\//g, '')}/${file}`)).isDirectory();
        if(i === true) {
            tosend.dirs.push(file);
        } else {
            tosend.files.push(file);
        };
    };
    res.send(JSON.stringify(tosend));
});