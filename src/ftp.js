module.exports.run = async function() {
const FtpSrv = require('ftp-srv');
const server = require('./server.js');
const path = require('path');
const publicIp = require('public-ip');
const pasv_url = await publicIp.v4();
const ftpServer = new FtpSrv({
    pasv_url,
    url: 'ftp://0.0.0.0:8079',
    pasv_min: 3000,
    pasv_max: 4000,
    greeting: ['Welcome', 'to', 'the', 'host'],
    timeout: 30000,
});

ftpServer.on('login', ({username, password}, resolve, reject) => {
    if (server.sql.have(username) && server.sql.get(username).pass === password) {
        resolve({root: path.join(__dirname, '../servers')});
    } else {
        reject('Bad username or password')
    };
});
ftpServer.listen();
};
