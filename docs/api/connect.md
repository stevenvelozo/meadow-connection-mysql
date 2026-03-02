# connect()

Creates the mysql2 connection pool synchronously.

## Signature

```javascript
connect()
```

## Parameters

None.

## Return Value

None.

## Behavior

1. Builds a connection settings object from `this.options.MySQL` (host, port, user, password, database, connectionLimit) plus `namedPlaceholders: true`
2. If a pool already exists (`this._ConnectionPool` is truthy):
   - Logs an error with cleansed settings (password replaced with `*****************`)
   - Skips pool creation to prevent duplicate connections
3. If no pool exists:
   - Logs the connection details (host, port, user, database, connection limit)
   - Calls `mysql2.createPool()` with the settings
   - Sets `this.connected = true`

## Basic Usage

```javascript
const libFable = require('fable');
const libMeadowConnectionMySQL = require('meadow-connection-mysql');

let _Fable = new libFable(
	{
		"MySQL":
		{
			"Server": "127.0.0.1",
			"Port": 3306,
			"User": "root",
			"Password": "secret",
			"Database": "bookstore",
			"ConnectionPoolLimit": 20
		}
	});

_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);
_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider');

_Fable.MeadowMySQLProvider.connect();

console.log(_Fable.MeadowMySQLProvider.connected);
// => true

// Query using the pool
_Fable.MeadowMySQLProvider.pool.query('SELECT * FROM Book LIMIT 5',
	(pError, pRows) =>
	{
		console.log(`Found ${pRows.length} books.`);
	});
```

## Double-Connect Guard

Calling `connect()` a second time does not create a new pool:

```javascript
_Fable.MeadowMySQLProvider.connect();
// First call -- pool created, connected = true

_Fable.MeadowMySQLProvider.connect();
// Second call -- logs error, pool unchanged
// "Meadow-Connection-MySQL trying to connect to MySQL but is already connected"
```

This prevents connection leaks from accidental double-initialization.

## Password Safety

When the double-connect guard triggers, the error log includes the connection settings with the password masked:

```
{ connectionLimit: 20, host: '127.0.0.1', port: 3306, user: 'root',
  password: '*****************', database: 'bookstore', namedPlaceholders: true }
```

## Related

- [connectAsync](connectAsync.md) -- Async connection with callback
- [pool](pool.md) -- Access the connection pool
