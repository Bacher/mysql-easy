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

var db = mysqlEasy.createPool({
    host: 'localhost',
    database: 'test',
    user: 'root',
    password: ''
});
````

## Methods:

#### Method "query":
````javascript
db.query('SELECT * FROM `users` WHERE `id` = ?', [12]).then(results => ...).catch(err => ...);
````

#### Method "select":
 *  **tableName**: string _(optional)_
 *  **fields**: Array|Object|string
 *  **where**: Object|string _(optional)_
 *  **limit**: number _(optional)_
 *  **offset**: number _(optional)_
````javascript
db.select('users', ['id', 'user_name'], { id: 12 }).then(results => ...);
````

#### Method "selectOne":
````javascript
db.selectOne('users', ['id', 'user_name'], { id: 12 }).then(user => {
    console.log(user['id']);
    console.log(user['user_name']);
});
````

#### Method "selectExactOne" (like selectOne but throw error if item not found):
````javascript
db.selectExactOne('users', ['id', 'user_name'], { id: 12 }).catch(err => {
    console.error(err);
});
````

#### Method "insert":
````javascript
db.insert('users', {
    user_name: 'user#331',
    age: 30
}).then(result => {
    console.log('New user ID: %s', result.insertId);
});
````

#### Method "delete" or "deleteFrom":
````javascript
db.delete('users', { id: 12 }).then(...);
````

#### Method "end" or "close":
````javascript
db.end();
````
