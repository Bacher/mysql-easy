const assert = require('chai').assert;
const mysql = require('../lib/mysql-easy');

/* global describe, beforeEach, it  */

const mysqlConnection = {
    format:   mysql.format.bind(mysql),
    escape:   mysql.escape.bind(mysql),
    escapeId: mysql.escapeId.bind(mysql)
};

function ok() {
    assert(true);
}

function bad() {
    assert(false);
}

function eq(...args) {
    assert.equal(...args);
}

describe('Query check', () => {

    beforeEach(() => {
        this.queryCallCount = 0;

        mysqlConnection.query = (...args) => {
            this.query = mysql.format(...args);
            this.queryCallCount++;
        };

        this.db = mysql.wrap(mysqlConnection);

        this.queryMustBe = query => eq(this.query, query);
    });

    describe('parts', () => {

        describe('table', () => {

            it('simple', () => {
                this.db.select({
                    table: 'hello'
                });

                this.queryMustBe('SELECT * FROM `hello`');
            });

        });

        describe('fields', () => {

            it('as raw', () => {
                this.db.select({
                    fields: 'field1',
                    table: 'hello'
                });

                this.queryMustBe('SELECT field1 FROM `hello`');
            });

            it('as array', () => {
                this.db.select({
                    fields: ['field1', 'field2'],
                    table: 'hello'
                });

                this.queryMustBe('SELECT `field1`,`field2` FROM `hello`');
            });

            it('as object', () => {
                this.db.select({
                    fields: {
                        field1: 'field_1',
                        field2: 'field_2'
                    },
                    table: 'hello'
                });

                this.queryMustBe('SELECT `field_1` AS `field1`,`field_2` AS `field2` FROM `hello`');
            });

        });

        describe('where', () => {

            it('as raw', () => {
                this.db.select({
                    table: 'hello',
                    where: 'a > 3'
                });

                this.queryMustBe('SELECT * FROM `hello` WHERE a > 3');
            });

            it('as object', () => {
                this.db.select({
                    table: 'hello',
                    where: {
                        'field_1': 100
                    }
                });

                this.queryMustBe('SELECT * FROM `hello` WHERE `field_1` = 100');
            });

            it('$gt', () => {
                this.db.select({
                    table: 'hello',
                    where: {
                        'field': {
                            $gt: 3
                        }
                    }
                });

                this.queryMustBe('SELECT * FROM `hello` WHERE `field` > 3');
            });

            it('$feild', () => {
                this.db.select({
                    table: 'hello',
                    where: {
                        'field': {
                            $field: 'another_field'
                        }
                    }
                });

                this.queryMustBe('SELECT * FROM `hello` WHERE `field` = `another_field`');
            });

            it('$feild in $gt', () => {
                this.db.select({
                    table: 'hello',
                    where: {
                        'field': {
                            $gt: {
                                $field: 'another_field'
                            }
                        }
                    }
                });

                this.queryMustBe('SELECT * FROM `hello` WHERE `field` > `another_field`');
            });

            it('throw error if empty object', () => {
                try {
                    this.db.select({
                        table: 'hello',
                        where: {
                            'field': {
                                $gt: {}
                            }
                        }
                    });

                    bad();
                } catch(err) {
                    ok();
                }
            });

        });

        describe('join', () => {

            it('as object', () => {
                this.db.select({
                    table: 'user',
                    join: {
                        table: 'details' ,
                        on: { 'user.id': 'details.user_id' },
                        type: 'left'
                    }
                });

                this.queryMustBe('SELECT * FROM `user` LEFT JOIN `details` ON `user`.`id` = `details`.`user_id`');
            });

            it('as array', () => {
                this.db.select({
                    table: 'user',
                    join: [{
                        table: 'details' ,
                        on: { 'user.id': 'details.user_id' },
                        type: 'left'
                    }, {
                        table: 'details2' ,
                        on: { 'details2.user_id': 'details.user_id' },
                        type: 'left'
                    }]
                });

                this.queryMustBe(
                    'SELECT * FROM `user` ' +
                    'LEFT JOIN `details` ON `user`.`id` = `details`.`user_id` ' +
                    'LEFT JOIN `details2` ON `details2`.`user_id` = `details`.`user_id`');
            });

            it('as raw', () => {
                this.db.select({
                    table: 'main_table',
                    join: 'LEFT JOIN another_table ON main_table.field_name1 = another_table.field_name2'
                });

                this.queryMustBe(
                    'SELECT * ' +
                    'FROM `main_table` ' +
                    'LEFT JOIN another_table ON main_table.field_name1 = another_table.field_name2');
            });

        });

        describe('group', () => {

            it('as array', () => {
                this.db.select({
                    table: 'hello',
                    groupBy: ['some_field']
                });

                this.queryMustBe('SELECT * FROM `hello` GROUP BY `some_field`');
            });

            it('as raw', () => {
                this.db.select({
                    table: 'hello',
                    groupBy: '`some_field`'
                });

                this.queryMustBe('SELECT * FROM `hello` GROUP BY `some_field`');
            });

            it('count', () => {
                this.db.select({
                    table: 'hello',
                    fields: {
                        id: 'some_field',
                        cnt: { $count: 'another' }
                    },
                    groupBy: ['some_field']
                });

                this.queryMustBe('SELECT `some_field` AS `id`,COUNT(`another`) AS `cnt` FROM `hello` GROUP BY `some_field`');
            });

            it('count', () => {
                this.db.select({
                    table: 'hello',
                    fields: {
                        id: 'some_field',
                        cnt: { $count: { $raw: 'super_field' } }
                    },
                    groupBy: ['some_field']
                });

                this.queryMustBe('SELECT `some_field` AS `id`,COUNT(super_field) AS `cnt` FROM `hello` GROUP BY `some_field`');
            });

        });

        describe('order', () => {

            it('as raw', () => {
                this.db.select({
                    table: 'hello',
                    order: 'a desc'
                });

                this.queryMustBe('SELECT * FROM `hello` ORDER BY a desc');
            });

            it('as object', () => {
                this.db.select({
                    table: 'hello',
                    order: {
                        a: -1,
                        b: 1
                    }
                });

                this.queryMustBe('SELECT * FROM `hello` ORDER BY `a` DESC, `b`');
            });

        });

    });

    describe('complex', () => {

        it('select', () => {
            this.db.select({
                table:  'myTableName',
                fields: {
                    id:     'id',
                    userId: 'user_id'
                },
                where:  {
                    'id':           'helloWorld',
                    'account_name': 'spy007'
                },
                order:  {
                    'id': 1
                }
            });

            this.queryMustBe(
                "SELECT `id` AS `id`,`user_id` AS `userId` " +
                "FROM `myTableName` " +
                "WHERE `id` = 'helloWorld' AND `account_name` = 'spy007' " +
                "ORDER BY `id`");
        });

        it('selectExactOne', () => {
            this.db.selectExactOne({
                table: 'myTableName',
                fields: {
                    id:     'id',
                    userId: 'user_id'
                },
                where: {
                    'id': 'helloWorld',
                    'account_name': 'spy007'
                }
            });

            this.queryMustBe(
                "SELECT `id` AS `id`,`user_id` AS `userId` " +
                "FROM `myTableName` " +
                "WHERE `id` = 'helloWorld' AND `account_name` = 'spy007' " +
                "LIMIT 1");
        });


        it('insert', () => {
            this.db.insert('myTableName', {
                'id': 'helloWorld',
                'account_name': 'spy007'
            });

            this.queryMustBe(
                "INSERT INTO `myTableName` " +
                "SET `id` = 'helloWorld', `account_name` = 'spy007'");
        });

        it('delete', () => {
            this.db.delete('myTableName', {
                'id': 'helloWorld',
                'account_name': 'spy007'
            });

            this.queryMustBe(
                "DELETE FROM `myTableName` " +
                "WHERE `id` = 'helloWorld' AND `account_name` = 'spy007'");
        });

        it('join', () => {
            this.db.select({
                table: { user: 'user' },
                join: {
                    table: { details: 'user_details' },
                    on: { 'user.id': { $field: 'details.user_id' } },
                    type: 'left'
                },
                fields: {
                    id:       'user.id',
                    userName: 'user.user_name',
                    hello:    'details.hello_world'
                },
                where: {
                    'user.id': 3
                }
            });

            this.queryMustBe(
                'SELECT `user`.`id` AS `id`,`user`.`user_name` AS `userName`,`details`.`hello_world` AS `hello` ' +
                'FROM `user` AS `user` ' +
                'LEFT JOIN `user_details` AS `details` ON `user`.`id` = `details`.`user_id` ' +
                'WHERE `user`.`id` = 3');
        });

    });

});

