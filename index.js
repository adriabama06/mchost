const web = require('./src/server.js');
const ftp = require('./src/ftp.js');

web.start();
ftp.run()