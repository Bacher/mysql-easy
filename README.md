# MySQL driver wrapper for easy work (with promises)

### Initial: 
````javascript
const mysqlEasy = require('mysql-easy');
````

## Static methods:

#### Method "createConnection" and "createPool":
(arguments are similar to static methods with same names in module "mysql": https://www.npmjs.com/package/mysql#establishing-connections)
````javascript
const db = mysqlEasy.createPool({
    host:     'localhost',
    database: 'test',
    user:     'root',
    password: ''
});
````

#### Method "wrap":
````javascript
const db = mysqlEasy.wrap(mysql.createPool(...));
````

#### Method "format":
(method is similar to "format" in module "mysql": https://www.npmjs.com/package/mysql#escaping-query-values)
 *  **sqlQuery**: string
 *  **params**: Array _(optional)_
````javascript
mysqlEasy.format('SELECT * FROM ?? WHERE id = ?', ['users', 12])
> "SELECT * FROM `users` WHERE id = '12'"
````

#### Method "escapeId":
 *  **id**: string
````javascript
mysqlEasy.escapeId('myTableName')
> "`myTableName`"
````

#### Method "escape":
 *  **value**: string
````javascript
mysqlEasy.escape('myValue')
> '"myValue"'
````

## Constructor:
Constructor is not directly accessible.

## Methods:

#### Method "query":
(method is similar to "query" in module "mysql": https://www.npmjs.com/package/mysql#performing-queries)
 *  **sqlQuery**: string
 *  **params**: Array _(optional)_
````javascript
db.query('SELECT * FROM `users` WHERE `id` = ?', [12])
    .then(results => ...).catch(err => ...);
````

#### Method "select":
 *  **params**: Object
     *  **table**: string
     *  **distinct**: boolean _(optional)_
     *  **fields**: Array|Object|string _(optional)_
     *  **where**: Object|string _(optional)_
     *  **order**: Object|string _(optional)_
     *  **limit**: number _(optional)_
     *  **offset**: number _(optional)_
````javascript
db.select({
    table: 'users',
    fields: ['id', 'user_name'],
    where: { id: 12 },
    order: { id: -1 }
}).then(results => ...);
````

#### Method "selectOne":
 *  **params**: Object
     *  **table**: string
     *  **fields**: Array|Object|string _(optional)_
     *  **where**: Object|string _(optional)_
     *  **order**: Object|string _(optional)_
````javascript
db.selectOne({
    table: 'users',
    fields: { id: 'id', userName: 'user_name' },
    where: { id: 12 }
}).then(user => {
    console.log(user.id);
    console.log(user.userName);
});
````

#### Method "selectExactOne" (like selectOne but throw error if item not found):
 *  **params**: Object
     *  **table**: string
     *  **fields**: Array|Object|string _(optional)_
     *  **where**: Object|string _(optional)_
     *  **order**: Object|string _(optional)_
````javascript
db.selectExactOne({
    table: 'users',
    fields: ['id', 'user_name'],
    where: { id: 12 }
}).catch(err => {
    console.error(err);
});
````

#### Method "insert":
 *  **tableName**: string
 *  **data**: Object
 *  **flags**: Object _(optional)_
````javascript
db.insert('users', {
    user_name: 'user#331',
    age: 30
}).then(result => {
    console.log('New user ID: %s', result.insertId);
});
````

#### Method "update":
 *  **tableName**: string
 *  **data**: Object
 *  **where**: Object|string _(optional)_
 *  **flags**: Object _(optional)_
````javascript
db.update('users', newUserState, {
    id: 12
}).then(...);
````

#### Method "delete" or "deleteFrom":
 *  **tableName**: string
 *  **where**: Object|string
````javascript
db.delete('users', { id: 12 }).then(...);
````

#### Method "end" or "close":
````javascript
db.end();
````

#### Method "unwrap":
````javascript
const underlyingMysqlConnection = db.unwrap();
````

## Transactions:
#### Method "createTransaction"
**returns** MySQL Promise with like instance with 2 additional methods: "commit" and "rollback"
````javascript
db.createTransaction().then(transaction => {
    transaction.update(...).then(() => {
        return transaction.insert(...);
    }).then(() => {
        return transaction.commit();
    }).catch(err => {
        transaction.rollback();
        console.log('Something going wrong', err);
    });
});
````
You must call commit either rollback at once.

### "Select" specific options:
Parameter **fields** can be one of:
  * Array - `['id', 'user_name']`
  * Object - key - result field name, value - column name `{ id: 'id', userName: 'user_name' }`
  * String - `'id, user_name AS userName'` (raw format)
  
Note:
  * if you use "group" you can select with aggregation:
     * `{ fieldName: { $count: 'field_name' } }`
     * `{ fieldName: { $avg: 'field_name' } }`
     * `{ fieldName: { $min: 'field_name' } }`
     * `{ fieldName: { $max: 'field_name' } }`
     * `{ fieldName: { $sum: 'field_name' } }`

Parameter **order** can be one of:
  * Object - `{ id: 1, age: -1 }` equal is `ORDER BY id, age DESC ` 
  * String - `'ORDER BY balance DESC, user_id'` (raw format)

Parameter **join** can be:
  * Object - `{ table: 'another_table', on: { 'main_table.field_name1: { $field: 'another_table.field_name2' } }, type: 'left' }`
  * String - `'LEFT JOIN another_table ON main_table.field_name1 = another_table.field_name2'` (raw format)

Parameter **group** can be:
  * Array - `['field_name','field_name_2']`
  * String - `'field_name, field_name_2'`

### General options:
Parameter **where** in all methods can be one of:
  * Object - `{ id: 12, age: 27 }` 
  * String - `'id = 12 AND age < 27'` (raw format)
  
Option "where" has "equal" default compare method, but you can use another:
  * $in - `{ id: { $in: [1,2,5] } }`
  * $is - `{ product_id: { $is: null } }`
  * $isNot - `{ product_id: { $isNot: null } }`
  * $gt - `{ age: { $gt: 25 } }`
  * $gte - `{ age: { $gte: 25 } }`
  * $lt - `{ age: { $lt: 25 } }`
  * $lte - `{ age: { $lte: 25 } }`
  * $field - `{ id: { $field: 'another_id' } }` => `'id = another_id'`
  * $raw - `{ position: { $raw: 'POINT(1,3)' } }`
  * $val - `{ position: { val: 'hello' } }`

You can combine few conditions (they will be combined by AND):
`{ age: { $gt: 10, $lte: 25 } }`

Also you can use **$or** and **$and**:
  * `{ $or: [{ field1: 3 }, { field1: 5 }] }`
  * `{ $and: [{ field1: 3 }, { field2: 'hello' }] }`
  * `{ $or: [ $or: [{ field1: 3 }, { field1: 5 }], { field2: 'hello' }] }`

Note:
  * `{ id: 3 }` and `{ id: { $eq: 3 } }` takes same result
  * `{ product_id: null }` and `{ product_id: { $is: null } }` takes same result
  * in join.on `{ 't1.id': 't2.user_id' }` will be `t1.id = t2.user_id` (field comparison)

### Flags
**insert** and **update** can take last argument "flags":
````javascript
{
  ignore: true
}
````
for statements like `INSERT IGNORE INTO table1 ...`
