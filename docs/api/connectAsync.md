# connectAsync(fCallback)

Async wrapper around `connect()` that provides a callback interface for consistency with other Meadow connection providers (MSSQL, SQLite, RocksDB).

## Signature

```javascript
connectAsync(fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | Yes | Callback with signature `(pError, pConnectionPool)` |

## Return Value

None (result provided via callback).

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `pError` | Error or null | Connection error, if any |
| `pConnectionPool` | mysql2 Pool | The mysql2 connection pool instance |

## Behavior

1. If `fCallback` is not a function, logs a warning and substitutes a no-op callback
2. If a pool already exists, returns it immediately via the callback (no reconnection)
3. Otherwise calls `connect()` to create the pool, then returns it via the callback
4. Wraps the entire operation in try-catch -- any errors are passed to the callback

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

_Fable.MeadowMySQLProvider.connectAsync(
	(pError, pConnectionPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		// pConnectionPool is the mysql2 pool
		pConnectionPool.query('SELECT * FROM Book LIMIT 5',
			(pQueryError, pRows) =>
			{
				console.log(`Found ${pRows.length} books.`);
			});
	});
```

## Idempotent Calls

Calling `connectAsync()` multiple times is safe -- if the pool already exists, it is returned without creating a new one:

```javascript
_Fable.MeadowMySQLProvider.connectAsync(
	(pError, pPool1) =>
	{
		// First call creates the pool

		_Fable.MeadowMySQLProvider.connectAsync(
			(pError, pPool2) =>
			{
				// Second call returns the same pool
				console.log(pPool1 === pPool2);
				// => true
			});
	});
```

## Why connectAsync() Exists

MySQL connection via mysql2 is inherently synchronous (the pool is created immediately, and TCP connections are managed lazily). The `connectAsync()` method exists for API consistency across Meadow connection providers:

- **MSSQL** -- Requires async handshake (TDS protocol)
- **SQLite** -- Requires async file open
- **RocksDB** -- Requires async database open

Using `connectAsync()` makes your code portable across database backends.

## Missing Callback Warning

If called without a callback, `connectAsync()` logs a warning:

```javascript
// Not recommended
_Fable.MeadowMySQLProvider.connectAsync();
// Logs: "Meadow MySQL connectAsync() called without a callback; this could lead to connection race conditions."
```

## Related

- [connect](connect.md) -- Synchronous connection
- [pool](pool.md) -- Access the connection pool
