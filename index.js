var mysql = require('mysql');

const _private = Symbol();

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
     * Format SQL query.
     * @param {string} sqlQuery
     * @param {Array} [params]
     * @returns {string}
     */
    static format(sqlQuery, params) {
        return mysql.format(sqlQuery, params);
    }

    /**
     * Constructor is hidden, use static methods "createConnection" or "createPool".
     * @protected
     * @param {Symbol} _access
     * @param {Pool|Connection} conn
     */
    constructor(_access, conn) {
        if (_access !== _private) {
            throw new Error('MySQLEasy can\'t be created by "new", use "createConnection" or "createPool" instead');
        }
        this._conn = conn;
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

    /**
     * Make simple query.
     * @param {string} sqlQuery
     * @param {Array} [params]
     * @returns {Promise}
     */
    query(sqlQuery, params) {
        var that = this;

        return new Promise(function(resolve, reject) {
            that._conn.query(sqlQuery, params, function(err, res) {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }

    /**
     * Select rows by where filter.
     * @param {string} tableName
     * @param {Object|Array|string} [fields]
     * @param {Object|string} [where]
     * @param {number} [limit]
     * @param {number} [offset]
     * @returns {Promise}
     */
    select(tableName, fields, where, limit, offset) {
        var sqlFields = getFields(fields);
        var sqlWhere = getWhere(where);

        if (arguments.length >= 5 && typeof offset !== 'number') {
            throw new Error('Parameter "offset" must be a number');
        }
        if (arguments.length >= 4 && typeof limit !== 'number') {
            throw new Error('Parameter "limit" must be a number');
        }

        var queryParts = [
            'SELECT',
            sqlFields,
            'FROM',
            iden(tableName)
        ];

        if (sqlWhere) {
            queryParts.push('WHERE', sqlWhere);
        }

        if (offset) {
            queryParts.push('OFFSET', offset);
        }

        if (limit) {
            queryParts.push('LIMIT', limit);
        }

        return this.query(queryParts.join(' '));
    }

    /**
     * Select one record.
     * @param {string} tableName
     * @param {Object|Array|string} [fields]
     * @param {Object|string} [where]
     * @returns {Promise}
     */
    selectOne(tableName, fields, where) {
        return this.select(tableName, fields, where, 1).then(function(items) { return items[0] || null });
    }

    /**
     * Select one or throw error if record not found.
     * @param {string} tableName
     * @param {Object|Array|string} [fields]
     * @param {Object|string} [where]
     * @returns {Promise}
     */
    selectExactOne(tableName, fields, where) {
        return this.select(tableName, fields, where, 1).then(function(items) {
            if (items.length === 0) {
                throw new Error('Record not found');
            }

            return items[0];
        });
    }

    /**
     * Insert new record.
     * @param {string} tableName
     * @param {object} objectData
     * @returns {Promise}
     */
    insert(tableName, objectData) {
        return this.query('INSERT INTO ? SET ?', [tableName, objectData]);
    }

    /**
     * Update record.
     * @param {string} tableName
     * @param {Object} objectData
     * @param {Object|string} where
     * @returns {Promise}
     */
    update(tableName, objectData, where) {
        var sqlWhere = getWhere(where);

        return this.query('UPDATE ?? SET ?' + (sqlWhere ? ' WHERE ' + sqlWhere : ''), [tableName, objectData]);
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
}

function iden(title) {
    return mysql.escapeId(title);
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
            return fields.map(iden).join(',')

        } else if (type === 'object') {
            var sqlFields = [];
            for (var fieldName in fields) {
                if (fields.hasOwnProperty(fieldName))
                    sqlFields.push(iden(fieldName) + ' AS ' + iden(fields[fieldName]));
            }
            return sqlFields.join(',');

        } else {
            throw new Error('Invalid arguments');
        }
    }
}

function getWhere(where, isRequired) {
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
            for (var fieldName in where) {
                if (where.hasOwnProperty(fieldName))
                    sqlWheres.push(mysql.format('?? = ?', [fieldName, where[fieldName]]));
            }
            return sqlWheres.join(' AND ');

        } else {
            throw new Error('Invalid arguments');
        }
    }
}

module.exports = MySQLEasy;
