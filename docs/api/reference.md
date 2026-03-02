# API Reference

Complete method and property documentation for `MeadowConnectionMySQL`.

---

## Class: MeadowConnectionMySQL

Extends `FableServiceProviderBase` from [fable-serviceproviderbase](https://github.com/stevenvelozo/fable-serviceproviderbase).

```javascript
const libMeadowConnectionMySQL = require('meadow-connection-mysql');
```

---

## Constructor

```javascript
new MeadowConnectionMySQL(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pFable` | Fable instance | Yes | The Fable instance for DI and configuration |
| `pManifest` | object | No | Service options, may include a `MySQL` config object |
| `pServiceHash` | string | No | Service instance hash for multiple instances |

**Construction behavior:**

1. If `pManifest` contains a `MySQL` object, uses those settings directly
2. Otherwise reads `MySQL` from `pFable.settings`
3. Coerces PascalCase property names (`Server`, `ConnectionPoolLimit`) to camelCase (`host`, `connectionLimit`)
4. Forces `namedPlaceholders: true` (required by Meadow)
5. If `MeadowConnectionMySQLAutoConnect` is set (in options or Fable settings), calls `connect()` automatically

---

## Properties

### connected

- **Type:** `boolean`
- **Default:** `false`

Whether the connection pool has been created. Set to `true` after a successful `connect()` call.

```javascript
if (_Fable.MeadowMySQLProvider.connected)
{
	console.log('Pool is ready.');
}
```

### pool

- **Type:** mysql2 Pool instance (getter)
- **Default:** `false` before connection

Returns the underlying mysql2 connection pool for direct queries. See [pool](pool.md) for full documentation.

```javascript
_Fable.MeadowMySQLProvider.pool.query('SELECT 1',
	(pError, pRows, pFields) =>
	{
		console.log(pRows);
	});
```

### serviceType

- **Type:** `string`
- **Value:** `'MeadowConnectionMySQL'`

The service type identifier used by Fable's service manager.

---

## Connection Methods

### connect()

Creates the mysql2 connection pool synchronously. See [connect()](connect.md) for full documentation.

```javascript
_Fable.MeadowMySQLProvider.connect();
```

### connectAsync(fCallback)

Async wrapper around `connect()` for consistency with other Meadow connection providers. See [connectAsync()](connectAsync.md) for full documentation.

```javascript
_Fable.MeadowMySQLProvider.connectAsync(
	(pError, pConnectionPool) =>
	{
		if (pError) return console.error(pError);
		// pConnectionPool is the mysql2 pool
	});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | Yes | Callback with signature `(pError, pConnectionPool)` |

---

## DDL Methods

### generateCreateTableStatement(pMeadowTableSchema)

Generates a MySQL `CREATE TABLE IF NOT EXISTS` statement from a Meadow table schema. See [generateCreateTableStatement()](generateCreateTableStatement.md) for full documentation.

```javascript
let tmpSQL = _Fable.MeadowMySQLProvider.generateCreateTableStatement(tmpSchema);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |

**Returns:** A string containing the CREATE TABLE DDL.

### createTable(pMeadowTableSchema, fCallback)

Generates and executes a CREATE TABLE statement against the connection pool. See [createTable()](createTable.md) for full documentation.

```javascript
_Fable.MeadowMySQLProvider.createTable(tmpSchema,
	(pError) =>
	{
		if (pError) console.error(pError);
	});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |
| `fCallback` | function | Callback with signature `(pError)` |

### createTables(pMeadowSchema, fCallback)

Creates all tables in a Meadow schema sequentially. See [createTables()](createTables.md) for full documentation.

```javascript
_Fable.MeadowMySQLProvider.createTables(tmpFullSchema,
	(pError) =>
	{
		if (pError) console.error(pError);
	});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowSchema` | object | Schema with a `Tables` array of table schemas |
| `fCallback` | function | Callback with signature `(pError)` |

### generateDropTableStatement(pTableName)

Generates a `DROP TABLE IF EXISTS` statement. See [generateDropTableStatement()](generateDropTableStatement.md) for full documentation.

```javascript
let tmpSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');
// => 'DROP TABLE IF EXISTS Book;'
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pTableName` | string | The table name to drop |

**Returns:** A string containing the DROP TABLE DDL.

---

## Configuration Reference

### PascalCase Format (Fable Settings)

```json
{
	"MySQL":
	{
		"Server": "127.0.0.1",
		"Port": 3306,
		"User": "root",
		"Password": "secret",
		"Database": "myapp",
		"ConnectionPoolLimit": 20
	},
	"MeadowConnectionMySQLAutoConnect": true
}
```

### camelCase Format (Direct mysql2)

```json
{
	"MySQL":
	{
		"host": "127.0.0.1",
		"port": 3306,
		"user": "root",
		"password": "secret",
		"database": "myapp",
		"connectionLimit": 20
	}
}
```

Both formats are accepted. PascalCase is coerced to camelCase in the constructor. The `namedPlaceholders` option is always forced to `true`.

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `MySQL.Server` / `MySQL.host` | string | -- | MySQL server hostname |
| `MySQL.Port` / `MySQL.port` | number | 3306 | MySQL server port |
| `MySQL.User` / `MySQL.user` | string | -- | Database user |
| `MySQL.Password` / `MySQL.password` | string | -- | Database password |
| `MySQL.Database` / `MySQL.database` | string | -- | Target database name |
| `MySQL.ConnectionPoolLimit` / `MySQL.connectionLimit` | number | -- | Maximum concurrent connections |
| `MeadowConnectionMySQLAutoConnect` | boolean | false | Auto-connect during instantiation |

---

## Column Type Mapping

Used by `generateCreateTableStatement()`:

| Meadow Type | MySQL Type | Default Value | Notes |
|-------------|-----------|---------------|-------|
| `ID` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | -- | Sets PRIMARY KEY |
| `GUID` | `CHAR(Size)` | `'0xDe'` | Size defaults to 36 |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `'0'` | Also sets PRIMARY KEY |
| `Numeric` | `INT NOT NULL` | `'0'` | |
| `Decimal` | `DECIMAL(Size)` | -- | Size is precision spec (e.g. `'10,2'`) |
| `String` | `CHAR(Size) NOT NULL` | `''` | |
| `Text` | `TEXT` | -- | |
| `DateTime` | `DATETIME` | -- | |
| `Boolean` | `TINYINT NOT NULL` | `'0'` | |

All tables are created with `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

---

## Multiple Instances

You can create multiple connection pools for different databases:

```javascript
_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider',
	{ MySQL: { host: 'primary-db', port: 3306, user: 'root', password: 'secret', database: 'app' } },
	'Primary');

_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider',
	{ MySQL: { host: 'analytics-db', port: 3306, user: 'root', password: 'secret', database: 'analytics' } },
	'Analytics');

// Access by hash
_Fable.servicesMap.MeadowConnectionMySQL['Primary'].connect();
_Fable.servicesMap.MeadowConnectionMySQL['Analytics'].connect();
```

---

## Related

- [connect()](connect.md) -- Create the connection pool
- [connectAsync()](connectAsync.md) -- Async connection with callback
- [pool](pool.md) -- Access the mysql2 pool
- [generateCreateTableStatement()](generateCreateTableStatement.md) -- Generate DDL
- [createTable()](createTable.md) -- Execute DDL for a single table
- [createTables()](createTables.md) -- Execute DDL for multiple tables
- [generateDropTableStatement()](generateDropTableStatement.md) -- Generate DROP TABLE
- [Schema & Table Creation](../schema.md) -- Full schema walkthrough
