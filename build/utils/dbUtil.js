"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commit = exports.rollback = exports.sqlExecMultipleRows = exports.sqlExecSingleRow = exports.getTransaction = exports.sqlToDB = exports.pgconfig_local = exports.pgconfig = void 0;
const pg_1 = require("pg");
const config = require("../config");
const logger = require("./logger");
exports.pgconfig = {
    user: config.db.user,
    database: config.db.database,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    max: config.db.max,
    idleTimeoutMillis: config.db.idleTimeoutMillis,
};
exports.pgconfig_local = {
    user: config.db_local.user,
    database: config.db_local.database,
    password: config.db_local.password,
    host: config.db_local.host,
    port: config.db_local.port,
    max: config.db_local.max,
    idleTimeoutMillis: config.db_local.idleTimeoutMillis,
};
const pool = new pg_1.Pool(exports.pgconfig);
const pool_local = new pg_1.Pool(exports.pgconfig_local);
logger.info(`DB Connection Settings: ${JSON.stringify(exports.pgconfig)}`);
pool.on("error", function (err) {
    logger.error(`idle Pool client error, ${err.message} | ${err.stack}`);
});
pool_local.on("error", function (err) {
    logger.error(`Pool Local  client error, ${err.message} | ${err.stack}`);
});
/*
 * Single Query to Postgres
 * @param sql: the query for store data
 * @param data: the data to be stored
 * @return result
 */
exports.sqlToDB = (sql, data, local = false) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`sqlToDB() sql: ${sql} | data: ${data}`);
    let result;
    try {
        if (local) {
            result = yield pool_local.query(sql, data);
        }
        else {
            result = yield pool.query(sql, data);
        }
        return result;
    }
    catch (error) {
        throw new Error(error.message);
    }
});
/*
 * Retrieve a SQL client with transaction from connection pool. If the client is valid, either
 * COMMMIT or ROALLBACK needs to be called at the end before releasing the connection back to pool.
 */
exports.getTransaction = () => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`getTransaction()`);
    const client = yield pool.connect();
    try {
        yield client.query("BEGIN");
        return client;
    }
    catch (error) {
        throw new Error(error.message);
    }
});
/*
 * Execute a sql statment with a single row of data
 * @param sql: the query for store data
 * @param data: the data to be stored
 * @return result
 */
exports.sqlExecSingleRow = (client, sql, data) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`sqlExecSingleRow() sql: ${sql} | data: ${data}`);
    let result;
    try {
        result = yield client.query(sql, data);
        logger.debug(`sqlExecSingleRow(): ${result.command} | ${result.rowCount}`);
        return result;
    }
    catch (error) {
        logger.error(`sqlExecSingleRow() error: ${error.message} | sql: ${sql} | data: ${data}`);
        throw new Error(error.message);
    }
});
/*
 * Execute a sql statement with multiple rows of parameter data.
 * @param sql: the query for store data
 * @param data: the data to be stored
 * @return result
 */
exports.sqlExecMultipleRows = (client, sql, data) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`inside sqlExecMultipleRows()`);
    logger.debug(`sqlExecMultipleRows() data: ${data}`);
    if (data.length !== 0) {
        for (let item of data) {
            try {
                logger.debug(`sqlExecMultipleRows() item: ${item}`);
                logger.debug(`sqlExecMultipleRows() sql: ${sql}`);
                yield client.query(sql, item);
            }
            catch (error) {
                logger.error(`sqlExecMultipleRows() error: ${error}`);
                throw new Error(error.message);
            }
        }
    }
    else {
        logger.error(`sqlExecMultipleRows(): No data available`);
        throw new Error("sqlExecMultipleRows(): No data available");
    }
});
/*
 * Rollback transaction
 */
exports.rollback = (client) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof client !== "undefined" && client) {
        try {
            logger.info(`sql transaction rollback`);
            yield client.query("ROLLBACK");
        }
        catch (error) {
            throw new Error(error.message);
        }
        finally {
            client.release();
        }
    }
    else {
        logger.warn(`rollback() not excuted. client is not set`);
    }
});
/*
 * Commit transaction
 */
exports.commit = (client) => __awaiter(void 0, void 0, void 0, function* () {
    logger.debug(`sql transaction committed`);
    try {
        yield client.query("COMMIT");
    }
    catch (error) {
        throw new Error(error.message);
    }
    finally {
        client.release();
    }
});
