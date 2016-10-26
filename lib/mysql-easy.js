var mysql = require('mysql');

var _private = Symbol();
var _select = Symbol();

class MySQLEasy {
    /**
     * Create connection.
     * @param {Object|string} options
     * @returns {MySQLEasy}
     */
    static createConnection(options) {
        return new MySQLEasy(_private, mysql.createConnection(options));
    }

    /**
     * Create connection.
     * @param {Object|string} options
     * @returns {MySQLEasy}
     */
    static createPool(options) {
        return new MySQLEasy(_private, mysql.createPool(options));
    }

    /**
     * Wrap existing mysql connection or pool.
     * @param {Connection|Pool} connection
     * @returns {MySQLEasy}
     */
    static wrap(connection) {
        return new MySQLEasy(_private, connection);
    }

    /**
     * Format SQL query.
     * @param {string} sqlQuery
     * @param {Array} [params]
     * @returns {string}
     */
    static format(sqlQuery, params) {
        return mysql.format(sqlQuery, params);
    }

    /**
     * Escape identifier.
     * @param {string} id
     * @returns {string}
     */
    static escapeId(id) {
        return mysql.escapeId(id);
    }

    /**
     * Escape value.
     * @param {string} value
     * @returns {string}
     */
    static escape(value) {
        return mysql.escape(value);
    }

    /**
     * Constructor is hidden, use static methods "createConnection" or "createPool".
     * @protected
     * @param {Symbol} _access
     * @param {Connection|Pool} conn
     */
    constructor(_access, conn) {
        if (_access !== _private) {
            throw new Error('MySQLEasy can\'t be created by "new", use "createConnection" or "createPool" instead');
        }

        this._plainObjects = false;
        this._profiling    = null;
        this._conn         = conn;
    }

    setOption(name, value) {
        switch (name) {
            case 'make-plain-objects':
                this._plainObjects = Boolean(value);
                break;
        }
    }

    /**
     * Enable profiling with callback.
     * @param {Function} callback
     */
    enableProfiling(callback) {
        this._profiling = callback.bind(null);
    }

    /**
     * Disable profiling.
     */
    disableProfiling() {
        this._profiling = null;
    }

    /**
     * Make simple query.
     * @param {string} sqlQuery
     * @param {Array} [params]
     * @returns {Promise}
     */
    query(sqlQuery, params) {
        if (this._profiling) {
            var start = Date.now();

            return new Promise((resolve, reject) => {
                this._conn.query(sqlQuery, params, (err, res) => {
                    var time = Date.now() - start;

                    setTimeout(() => {
                        if (this._profiling) {
                            this._profiling({
                                query:  mysql.format(sqlQuery, params),
                                time:   time,
                                error:  err,
                                result: res
                            });
                        }
                    }, 0);

                    if (err) {
                        reject(err);
                    } else {
                        resolve(this._processResults(res));
                    }
                });
            });
        } else {
            return new Promise((resolve, reject) => {
                this._conn.query(sqlQuery, params, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this._processResults(res));
                    }
                });
            });
        }
    }

    /**
     * Truncate the table.
     * @param {string} tableName
     * @returns {Promise}
     */
    truncate(tableName) {
        return this.query('TRUNCATE ??', tableName);
    }

    /**
     * Create transaction (allowed only for connection type "Pool").
     * @returns {Promise<Transaction>}
     */
    createTransaction() {
        if (this._conn.constructor.name !== 'Pool') {
            throw new Error('Connection type must be a pool');
        }

        return new Promise((resolve, reject) => {
            this._conn.getConnection((err, conn) => {
                if (err) {
                    reject(err);
                } else {
                    conn.beginTransaction(err => {
                        if (err) {
                            reject(err);
                        } else {
                            var transaction = new Transaction(_private, conn);
                            transaction._profiling = this._profiling;

                            resolve(transaction);
                        }
                    });
                }
            });
        });
    }

    [_select](table, fields, join, where, group, order, limit, offset, isDistinct) {
        if (!table) {
            throw new Error('Parameter "table" missing');
        }

        if (offset != null && typeof offset !== 'number') {
            throw new Error('Parameter "offset" must be a number');
        }
        if (limit != null && typeof limit !== 'number') {
            throw new Error('Parameter "limit" must be a number');
        }

        var sqlGroup, sqlOrder, sqlJoin;
        var sqlFields = getFields(fields);
        var sqlWhere  = getWhere(where);

        if (group) {
            sqlGroup = getGroup(group);
        }
        if (order) {
            sqlOrder = getOrder(order);
        }
        if (join) {
            sqlJoin = getJoins(join);
        }

        var queryParts = [
            'SELECT' + (isDistinct ? ' DISTINCT' : ''),
            sqlFields,
            'FROM',
            getTable(table)
        ];

        if (sqlJoin) {
            queryParts.push(sqlJoin);
        }

        if (sqlWhere) {
            queryParts.push('WHERE', sqlWhere);
        }

        if (sqlGroup) {
            queryParts.push('GROUP BY', sqlGroup);
        }

        if (sqlOrder) {
            queryParts.push('ORDER BY', sqlOrder);
        }

        if (limit) {
            queryParts.push('LIMIT', offset ? `${offset},${limit}` : limit);
        } else if (offset) {
            throw new Error('Can\'t set offset without limit');
        }

        return this.query(queryParts.join(' '));
    }

    /**
     * Select rows by where filter.
     * @param {Object} params
     * @param {string} params.table
     * @param {Object|Array|string} [params.fields]
     * @param {Array} [params.join]
     * @param {Object|string} [params.where]
     * @param {Object|string} [params.order]
     * @param {number} [params.limit]
     * @param {number} [params.offset]
     * @returns {Promise}
     */
    select(params) {
        checkParams(params);
        return this[_select](
            params.table,
            params.fields,
            params.join,
            params.where,
            params.group || params.groupBy,
            params.order || params.orderBy,
            params.limit,
            params.offset,
            params.distinct
        );
    }

    /**
     * Select one record.
     * @param {Object} params
     * @param {string} params.table
     * @param {Object|Array|string} [params.fields]
     * @param {Object|string} [params.where]
     * @param {Object|string} [params.order]
     * @returns {Promise}
     */
    selectOne(params) {
        checkParams(params, true);
        return this[_select](
            params.table,
            params.fields,
            params.join,
            params.where,
            params.group || params.groupBy,
            params.order || params.orderBy,
            1,
            params.offset,
            params.distinct
        ).then(function(items) {
            return items[0] || null;
        });
    }

    /**
     * Select one or throw error if record not found.
     * @param {Object} params
     * @param {string} params.table
     * @param {Object|Array|string} [params.fields]
     * @param {Object|string} [params.where]
     * @param {Object|string} [params.order]
     * @returns {Promise}
     */
    selectExactOne(params) {
        checkParams(params, true);
        return this[_select](
            params.table,
            params.fields,
            params.join,
            params.where,
            params.group || params.groupBy,
            params.order || params.orderBy,
            1,
            params.offset,
            params.distinct
        ).then(function(items) {
            if (items.length === 0) {
                throw new Error('Record not found');
            }

            return items[0];
        });
    }

    /**
     * Insert new record.
     * @param {string} tableName
     * @param {Object} objectData
     * @param {Object} flags
     * @returns {Promise}
     */
    insert(tableName, objectData, flags) {
        return this.query(`INSERT${flags && flags.ignore ? ' IGNORE': ''} INTO ?? SET ${getSetValues(objectData)}`, [tableName]);
    }

    /**
     * Update record.
     * @param {string} tableName
     * @param {Object} objectData
     * @param {Object|string} [where]
     * @param {Object} [flags]
     * @returns {Promise}
     */
    update(tableName, objectData, where, flags) {
        var sqlWhere = getWhere(where);

        return this.query(`UPDATE${flags && flags.ignore ? ' IGNORE' : ''} ?? SET ` + getSetValues(objectData, true) + (sqlWhere ? ' WHERE ' + sqlWhere : ''), [tableName]);
    }

    /**
     * Delete records from table.
     * @param {string} tableName
     * @param {object|string} where
     * @returns {Promise}
     */
    deleteFrom(tableName, where) {
        var sqlWhere = getWhere(where, true);

        return this.query('DELETE FROM ' + iden(tableName) + ' WHERE ' + sqlWhere);
    }

    /**
     * Delete records from table.
     * @param {string} tableName
     * @param {object|string} where
     * @returns {Promise}
     */
    ['delete'](tableName, where) {
        return this.deleteFrom(tableName, where);
    }

    /**
     * Get underlying mysql pool or connection.
     * @returns {Connection|Pool}
     */
    unwrap() {
        return this._conn;
    }

    /**
     * Close connection.
     */
    end() {
        this._conn.end();
    }

    /**
     * Close connection.
     */
    close() {
        this.end();
    }

    _processResults(res) {
        if (this._plainObjects && Array.isArray(res)) {
            return res.map(resObject => {
                var obj = {};

                for (var propName in resObject) {
                    obj[propName] = resObject[propName];
                }

                return obj;
            });
        } else {
            return res;
        }
    }

}

class Transaction extends MySQLEasy {

    constructor(...args) {
        super(...args);

        this.status = 'pending';
    }

    commit() {
        return new Promise((resolve, reject) => {
            if (this._conn) {
                var conn = this._conn;
                this._conn = null;

                this.status = 'committing';

                conn.commit(err => {
                    if (err) {
                        this.status = 'rejected';

                        conn.rollback(err => {
                            if (err) {
                                conn.destroy();
                            } else {
                                conn.release();
                            }
                        });

                        reject(err);
                    } else {
                        this.status = 'committed';
                        conn.release();

                        resolve();
                    }
                });
            } else if (this.status === 'rejected') {
                throw new Error('Already rejected');
            } else {
                resolve();
            }
        });
    }

    rollback() {
        return new Promise(resolve => {
            if (this._conn) {
                this.status = 'rejected';
                var conn    = this._conn;
                this._conn  = null;

                conn.rollback(err => {
                    if (err) {
                        conn.destroy();
                    } else {
                        conn.release();
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

}

MySQLEasy.prototype.format   = MySQLEasy.format;
MySQLEasy.prototype.escape   = MySQLEasy.escape;
MySQLEasy.prototype.escapeId = MySQLEasy.escapeId;

function iden(title) {
    return mysql.escapeId(title);
}

function val(value) {
    return mysql.escape(value);
}

function getTable(table) {
    if (typeof table === 'object') {
        for (var propName in table) {
            if (table.hasOwnProperty(propName)) {
                return `${iden(table[propName])} AS ${iden(propName)}`;
            }
        }
    } else {
        return iden(table);
    }
}

function getFields(fields) {
    if (fields === null) {
        throw new Error('Parameter "fields" must be not null');

    } else if (fields === undefined) {
        return '*';

    } else {
        var type = typeof fields;

        if (type === 'string') {
            return fields;

        } else if (Array.isArray(fields)) {
            return fields.map(iden).join(',');

        } else if (type === 'object') {
            var sqlFields = [];
            for (var fieldName in fields) {
                if (!fields.hasOwnProperty(fieldName)) {
                    continue;
                }

                var value = fields[fieldName];

                if (typeof value === 'object') {
                    var aggreg;
                    var aggregField;

                    if (value.$count !== undefined) {
                        aggreg      = 'COUNT';
                        aggregField = value.$count;

                    } else if (value.$avg !== undefined) {
                        aggreg      = 'AVG';
                        aggregField = value.$avg;

                    } else if (value.$min !== undefined) {
                        aggreg      = 'MIN';
                        aggregField = value.$min;

                    } else if (value.$max !== undefined) {
                        aggreg      = 'MAX';
                        aggregField = value.$max;

                    } else if (value.$sum !== undefined) {
                        aggreg      = 'SUM';
                        aggregField = value.$sum;

                    } else {
                        throw new Error('Bad field description');
                    }

                    var formatted = formatValue(aggregField, true);

                    sqlFields.push(`${aggreg}(${formatted}) AS ${iden(fieldName)}`);

                } else {
                    sqlFields.push(`${iden(fields[fieldName])} AS ${iden(fieldName)}`);
                }
            }
            return sqlFields.join(',');

        } else {
            throw new Error('Invalid arguments');
        }
    }
}

function getJoins(joins) {
    if (Array.isArray(joins)) {
        return joins.map(getJoin).join(' ');
    } else {
        return getJoin(joins);
    }
}

function getJoin(join) {
    if (typeof join === 'string') {
        return join;
    }

    var joinParts = [];

    if (!join.on) {
        throw new Error('Join has not field "on"');
    }

    if (join.type === 'left') {
        joinParts.push('LEFT');
    } else if (join.type === 'right') {
        joinParts.push('RIGHT');
    } else if (join.type === 'FULL') {
        joinParts.push('FULL');
    }

    joinParts.push('JOIN', getTable(join.table), 'ON', getWhere(join.on, true, true));

    return joinParts.join(' ');
}

function getSetValues(data, isUpdate) {
    var valueStatement;
    var fields = [];

    for (var fieldName in data) {
        if (!data.hasOwnProperty(fieldName)) {
            continue;
        }

        var value = data[fieldName];

        if (value) {
            if (value.$raw) {
                valueStatement = value.$raw;
            } else if (value.$point) {
                if (value.$point instanceof Array) {
                    valueStatement = `POINT(${value.$point[0]},${value.$point[1]})`;
                } else {
                    valueStatement = `POINT(${value.$point.x},${value.$point.y})`;
                }
            } else if (value.$field && isUpdate) {
                valueStatement = iden(value.$field);
            } else {
                valueStatement = val(value);
            }
        } else {
            valueStatement = val(value);
        }

        fields.push(iden(fieldName) + '=' + valueStatement);
    }

    return fields.join(',');
}

function getWhere(where, isRequired, isJoinOn) {
    if (where == null) {
        if (isRequired) {
            throw new Error('Parameter "where" must be not null');
        } else {
            return null;
        }

    } else {
        var type = typeof where;

        if (type === 'string') {
            return where;

        } else if (type === 'object') {
            var sqlWheres = [];

            if (where.$or !== undefined) {
                return `(${where.$or.map(cond => getWhere(cond, true, isJoinOn)).join(' OR ')})`;
            }

            if (where.$and !== undefined) {
                return `(${where.$and.map(cond => getWhere(cond, true, isJoinOn)).join(' AND ')})`;
            }

            for (var fieldName in where) {
                if (where.hasOwnProperty(fieldName)) {
                    var escapedField = iden(fieldName);

                    var data = where[fieldName];

                    if (data === null) {
                        if (isJoinOn) {
                            throw new Error('Bad join on option');
                        } else {
                            sqlWheres.push(`${escapedField} IS NULL`);
                        }

                    } else if (typeof data === 'object' && !(data instanceof Date)) {
                        if (data.$field !== undefined) {
                            sqlWheres.push(`${escapedField} = ${formatValue(data)}`);
                        } else {
                            var whereCount = sqlWheres.length;

                            if (data.$like !== undefined) {
                                sqlWheres.push(`${escapedField} LIKE ${formatValue(data.$like)}`);
                            }

                            if (data.$eq !== undefined) {
                                if (data.$eq === null) {
                                    sqlWheres.push(`${escapedField} IS NULL`);
                                } else {
                                    sqlWheres.push(`${escapedField} = ${formatValue(data.$eq)}`);
                                }
                            }

                            if (data.$gt !== undefined) {
                                sqlWheres.push(`${escapedField} > ${formatValue(data.$gt)}`);
                            }

                            if (data.$gte !== undefined) {
                                sqlWheres.push(`${escapedField} >= ${formatValue(data.$gte)}`);
                            }

                            if (data.$lt !== undefined) {
                                sqlWheres.push(`${escapedField} < ${formatValue(data.$lt)}`);
                            }

                            if (data.$lte !== undefined) {
                                sqlWheres.push(`${escapedField} <= ${formatValue(data.$lte)}`);
                            }

                            if (data.$in !== undefined) {
                                sqlWheres.push(`${escapedField} IN (${formatValue(data.$in)})`);
                            }

                            if (data.$is !== undefined) {
                                sqlWheres.push(`${escapedField} IS ${formatValue(data.$is)}`);
                            }

                            if (data.$isNot !== undefined) {
                                sqlWheres.push(`${escapedField} IS NOT ${formatValue(data.$isNot)}`);
                            }

                            if (whereCount === sqlWheres.length) {
                                throw new Error('Where object has not contains any of ' +
                                    '$like,$eq,$gt,$gte,$lt,$lte,$in,$is,$isNot');
                            }
                        }

                    } else {
                        sqlWheres.push(`${escapedField} = ${isJoinOn ? iden(data) : val(data)}`);
                    }

                }
            }
            return sqlWheres.join(' AND ');

        } else {
            throw new Error('Invalid arguments');
        }
    }
}

function formatValue(data, isIdenPriority) {
    if (data != null) {
        if (data.$raw) {
            return data.$raw;
        } else if (data.$val) {
            return val(data.$val);
        } else if (data.$field) {
            return iden(data.$field);
        }
    }

    return isIdenPriority ? iden(data) : val(data);
}

function getGroup(group) {
    if (typeof group === 'string') {
        return group;
    } else {
        return group.map(iden).join(',');
    }
}

function getOrder(order) {
    if (typeof order === 'string') {
        return order;

    } else {
        var orders = [];

        for (var propName in order) {
            if (order.hasOwnProperty(propName)) {
                if (order[propName] < 0) {
                    orders.push(iden(propName) + ' DESC');
                } else {
                    orders.push(iden(propName));
                }
            }
        }

        return orders.join(', ');
    }
}

var allowedFields = new Set();
allowedFields.add('table');
allowedFields.add('join');
allowedFields.add('distinct');
allowedFields.add('fields');
allowedFields.add('where');
allowedFields.add('limit');
allowedFields.add('offset');
allowedFields.add('order');
allowedFields.add('orderBy');
allowedFields.add('group');
allowedFields.add('groupBy');

function checkParams(params, isSelectOne) {
    for (let fieldName in params) {
        if (!allowedFields.has(fieldName)) {
            throw Error(`Invalid param name "${fieldName}"`);
        }

        if (isSelectOne && fieldName === 'limit') {
            throw Error('Invalid param "limit" for selectOne method');
        }
    }
}

module.exports = MySQLEasy;
