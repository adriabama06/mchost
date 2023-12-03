const child_process = require('child_process');
const socketio = require('socket.io');
const { EventEmitter } = require('events');
const server = require('./server.js');
const path = require('path');
const fs = require('fs');

module.exports = class extends EventEmitter {
    /**
     * @param {string} directory
     * @param {string} servername
     * @param {socketio.Server} socket
     */
    constructor(directory, servername, socket) {
        super();
        /**
         * @type {{jarfile: string, directory: string, state: 'online' | 'offline',
         * jsonconfig: {version: string, type: string, ram: string},
         * properties: getServerPropetiles}}
         */
        this.info = {
            jarfile: path.join(directory, "server.jar"),
            directory: directory,
            state: 'online',
            jsonconfig: require(path.join(directory, 'info.json')),
            properties: getServerPropetiles(servername),
        };
        this.cmd = child_process.exec(`java -Xmx${this.info.jsonconfig.ram}M -Xms${this.info.jsonconfig.ram}M -jar "${this.info.jarfile}" nogui`, { cwd: directory });

        this.cmd.stdout.on('data', async (data) => {
            this.emit('log', data);
            socket.sockets.emit('log', {
                name: servername,
                message: data.toString(),
            });
        });

        this.cmd.on('close', async () => {
            server.cmds.delete(servername);
        });
    };

    /**
     * @param {string} msg
     * @returns {Function<void>}
     */
    send(msg) {
        this.cmd.stdin.write(msg+"\r");
        return;
    };
};

/**
 * @param {string} server 
 * @returns {{
 * spawnprotection: string,
 * generatorsettings: string,
 * forcegamemode: 'true' | 'false',
 * allownether: 'true' | 'false',
 * gamemode: '0' | '1' | '2' | '3',
 * broadcastconsoletoops: 'true' | 'false',
 * enablequery: 'true' | 'false',
 * playeridletimeout: string,
 * difficulty: '0' | '1' | '2' | '3',
 * spawnmonsters: 'true' | 'false',
 * oppermissionlevel: string,
 * resourcepackhash: string,
 * announceplayerachievements: 'true' | 'false',
 * pvp: 'true' | 'false',
 * snooperenabled: 'true' | 'false',
 * leveltype: string,
 * hardcore: 'true' | 'false',
 * enablecommandblock: 'true' | 'false',
 * maxplayers: string,
 * networkcompressionthreshold: string,
 * maxworldsize: string,
 * serverport: string,
 * debug: 'true' | 'false',
 * serverip: '0.0.0.0' | 'localhost' | '192.168.1.',
 * spawnnpcs: 'true' | 'false',
 * allowflight: 'true' | 'false',
 * levelname: string,
 * viewdistance: '2' | '4' | '6' | '8' | '12' | '16' | '32',
 * resourcepack: string,
 * spawnanimals: 'true' | 'false',
 * whitelist: 'true' | 'false',
 * generatestructures: 'true' | 'false',
 * onlinemode: 'true' | 'false',
 * maxbuildheight: string,
 * levelseed: string,
 * motd: string,
 * enablercon: 'true' | 'false'}}
 */
function getServerPropetiles(server) {
    const serverpropetiles = fs.readFileSync(path.join(__dirname, `../servers/${server}/server.properties`)).toString().split('\n');
    serverpropetiles.splice(0, 2);
    var propetiles = {}
    for(const line of serverpropetiles) {
        if(line === '') {
            continue;
        };
        const i = line.split('=');
        propetiles[`${i[0].replace(/-/g, '')}`.toString()] = i[1].replace('\\r', '').toString();
    };
    return propetiles;
};
module.exports.getServerPropetiles = getServerPropetiles;