# MySQL driver wrapper for easy work (with promises)

Parameter **fields** in all methods can be one of:
  * Array - `['id', 'user_name']`
  * Object - key - colomn name, value - result field name `{ id: 'id', user_name': 'userName' }`
  * String - `'id, user_name AS userName'` (raw format)
  
Parameter **where** in all methods can be one of:
  * Object - `{ id: 12, age: 27 }` equal is `id = 12 AND age = 27` 
  * String - `'balance > 12 OR age < 30'` (raw format)


### Initial: 
````javascript
var mysqlEasy = require('mysql-easy');
````

## Static methods:

#### Method "createConnection" and "createPool":
(arguments similar to methods with same names in module "mysql" https://www.npmjs.com/package/mysql)
````javascript
var db = mysqlEasy.createPool({
    host: 'localhost',
    database: 'test',
    user: 'root',
    password: ''
});
````

#### Method "format":
 *  **sqlQuery**: string
 *  **params**: Array _(optional)_
````javascript
mysqlEasy.format('SELECT * FROM ?? WHERE id = ?', ['users', 12])
> "SELECT * FROM `users` WHERE id = '12'"
````

## Methods:

#### Method "query":
````javascript
db.query('SELECT * FROM `users` WHERE `id` = ?', [12]).then(results => ...).catch(err => ...);
````

#### Method "select":
 *  **tableName**: string
 *  **fields**: Array|Object|string _(optional)_
 *  **where**: Object|string _(optional)_
 *  **limit**: number _(optional)_
 *  **offset**: number _(optional)_
````javascript
db.select({
    table: 'users',
    fields: ['id', 'user_name'],
    where: { id: 12 }
).then(results => ...);
````

#### Method "selectOne":
 *  **tableName**: string
 *  **fields**: Array|Object|string _(optional)_
 *  **where**: Object|string _(optional)_
````javascript
db.selectOne({
    table: 'users',
    fields: ['id', 'user_name'],
    where: { id: 12 }
).then(user => {
    console.log(user['id']);
    console.log(user['user_name']);
});
````

#### Method "selectExactOne" (like selectOne but throw error if item not found):
 *  **tableName**: string
 *  **fields**: Array|Object|string _(optional)_
 *  **where**: Object|string _(optional)_
````javascript
db.selectExactOne({
    table: 'users',
    fields: ['id', 'user_name'],
    where: { id: 12 }
).catch(err => {
    console.error(err);
});
````

#### Method "insert":
 *  **tableName**: string
 *  **data**: Object
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
 *  **where**: Object|string
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
