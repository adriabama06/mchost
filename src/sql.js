const mysql = require('mysql');
const { EventEmitter } = require('events');

module.exports = class {
    /**
     * @param {number} autochecktime - In seconds default: 360
     * @param {{host: string, user: string, password: string, database: string}} db
     */
    constructor(db, autochecktime = 360) {
        /**
         * @type {Map<string, {user: string, pass: string}>}
         */
        this.map = new Map();
        
        this.connection = mysql.createConnection({
            host: db.host,
            user: db.user,
            password: db.password,
            database: db.database,
            //connectTimeout: 2,
        });

        this.db = db;
        
        this.connection.connect();
        this.autocheck = setInterval(async () => {
            await this.reload();
        }, (autochecktime*1000));
        this.reload();
    };

    /**
     * @param {string} username 
     * @returns {{user: string, pass: string}}
     */
    get(username) {
        return this.map.get(username);
    };
    /**
     * @param {string} username 
     * @returns {boolean}
     */
    have(username) {
        return this.map.has(username);
    };
    /**
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<void>}
     */
    set(username, password) {
        return new Promise(async (resolve, reject) => {
            /**
             * @type {string}
             */
            var sql;
            if (this.map.has(username)) {
                sql = `UPDATE ${this.db.database}.users SET (\`pass\`= '${password}') WHERE \`user\` = '${username}'`;
                this.map.set(username, { user: username, pass: password });
            } else {
                sql = `INSERT INTO ${this.db.database}.users (\`user\`, \`pass\`) VALUES ('${username}', '${password}')`;
            };
            this.map.set(username, { user: username, pass: password });

            this.connection.query(sql, async (err, results, fields) => {
                if (err) {
                    console.log(err);
                };
                resolve();
            });
        });
    };
    /**
     * @param {string} username
     * @returns {Promise<void>}
     */
    delete(username) {
        return new Promise(async (resolve, reject) => {
            /**
             * @type {string}
             */
            var sql = `DELETE FROM ${this.db.database}.users WHERE \`user\` = '${username}';`;
            if(this.map.has(username)) {
                this.map.delete(username);
                this.connection.query(sql, async (err, results, fields) => {
                    if (err) {
                        console.log(err);
                    };
                    resolve();
                });
            };
            resolve();
        });
    };
    
    /**
     * @returns {[{user: string, pass: string}]}
     */
    all() {
        return this.map.entries();
    };

    /**
     * @returns {Promise<void>}
     */
    async reload() {
        return new Promise(async (resolve, reject) => {
            var sql = `SELECT * FROM ${this.db.database}.users`;

            this.connection.query(sql, async (err, results, fields) => {
                if(err) console.log(err);
                if(results && results[0]) {
                    this.map.clear();
                    for(const p of results) {
                        this.map.set(p.user, { user: p.user, pass: p.pass });
                    };
                    resolve();
                };
            });
        });
    };

    /**
     * @param {string} sql 
     * @returns {Promise<[]>}
     */
    async sql(sql) {
        return new Promise(async (resolve, reject) => {

            this.connection.query(sql, async (err, results, fields) => {
                if(err) console.log(err);
                resolve(results);
            });
        });
    };
};