var savedSqlQuery;

var assert = require('assert');
var mysql = require('mysql');

var Module = require('module');
var originalRequire = Module.prototype.require;

Module.prototype.require = function(moduleName) {
    if (moduleName === 'mysql') {
        return {
            createPool() {
                return {
                    query(sqlQuery, params, callback) {
                        savedSqlQuery = mysql.format(sqlQuery, params);
                        callback(null, [{ test: true }]);
                    }
                }
            },
            format: mysql.format.bind(mysql),
            escapeId: mysql.escapeId.bind(mysql)
        };
    } else {
        return originalRequire.apply(this, arguments);
    }
};

var MySQLEasy = require('../index.js');

var db = MySQLEasy.createPool({});

Promise.resolve()
    .then(() => db.selectExactOne('myTableName', {
        'id': 'id',
        'user_id': 'userId'
    }, {
        'id': 'hello World',
        'account_name': 'spy007'
    }).then(result => {
        assert.equal(savedSqlQuery, "SELECT `id` AS `id`,`user_id` AS `userId` FROM `myTableName` WHERE `id` = 'helloWorld' AND `account_name` = 'spy007' LIMIT 1");
        console.log('[ OK ]', savedSqlQuery);
    }).catch(err => {
        console.error(err);
    }))
    .then(() => db.insert('myTableName', {
        'id': 'helloWorld',
        'account_name': 'spy007'
    }).then(result => {
        assert.equal(savedSqlQuery, "INSERT INTO 'myTableName' SET `id` = 'helloWorld', `account_name` = 'spy007'");
        console.log('[ OK ]', savedSqlQuery);
    }).catch(err => {
        console.error(err);
    })).then(() => db.delete('myTableName', {
        'id': 'helloWorld',
        'account_name': 'spy007'
    }).then(result => {
        assert.equal(savedSqlQuery, "DELETE FROM `myTableName` WHERE `id` = 'helloWorld' AND `account_name` = 'spy007'");
        console.log('[ OK ]', savedSqlQuery);
    }).catch(err => {
        console.error(err);
    }));
