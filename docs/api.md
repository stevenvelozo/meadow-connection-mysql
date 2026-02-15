# API Reference

## Class: MeadowConnectionMySQL

Extends `FableServiceProviderBase` from fable-serviceproviderbase.

```javascript
const libMeadowConnectionMySQL = require('meadow-connection-mysql');
```

## Constructor

```javascript
new MeadowConnectionMySQL(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pFable` | Fable instance | Yes | The Fable instance for DI and configuration |
| `pManifest` | object | No | Service options, may include a `MySQL` config object |
| `pServiceHash` | string | No | Service instance hash |

**Construction behavior:**

1. If `pManifest` contains a `MySQL` object, uses those settings directly
2. Otherwise reads `MySQL` from `pFable.settings`
3. Coerces PascalCase property names (`Server`, `ConnectionPoolLimit`) to camelCase (`host`, `connectionLimit`)
4. Forces `namedPlaceholders: true` (required by Meadow)
5. If `MeadowConnectionMySQLAutoConnect` is set (in options or Fable settings), calls `connect()` automatically

## Instance Properties

### connected

- **Type:** boolean
- **Default:** `false`
- **Description:** Whether the connection pool has been created.

### pool

- **Type:** mysql2 Pool instance (getter)
- **Description:** The underlying mysql2 connection pool. Use this for direct queries.

```javascript
_Fable.MeadowMySQLProvider.pool.query('SELECT 1',
    (pError, pRows, pFields) =>
    {
        console.log(pRows);
    });
```

### serviceType

- **Type:** string
- **Value:** `'MeadowConnectionMySQL'`

## Instance Methods

### connect()

Creates the mysql2 connection pool synchronously.

```javascript
_Fable.MeadowMySQLProvider.connect();
```

**Behavior:**

- Creates a pool via `mysql2.createPool()` with the resolved settings
- Sets `this.connected = true`
- If already connected, logs an error and skips (prevents duplicate pools)
- Logs the connection details (password is masked in logs)

### connectAsync(fCallback)

Async wrapper around `connect()` for consistency with other database drivers.

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

**Behavior:**

- If already connected, returns the existing pool
- Otherwise calls `connect()` and returns the new pool
- Wraps in try-catch for error handling
- Logs a warning if called without a callback

### generateCreateTableStatement(pMeadowTableSchema)

Generates a MySQL CREATE TABLE statement from a Meadow table schema.

```javascript
let tmpSQL = _Fable.MeadowMySQLProvider.generateCreateTableStatement(schema);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |

**Returns:** A string containing the CREATE TABLE DDL.

See [Schema & Table Creation](schema.md) for the full type mapping.

### createTable(pMeadowTableSchema, fCallback)

Generates and executes a CREATE TABLE statement against the connection pool.

```javascript
_Fable.MeadowMySQLProvider.createTable(schema,
    (pError) =>
    {
        if (pError) console.error(pError);
    });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | object | Schema with `TableName` and `Columns` array |
| `fCallback` | function | Callback with signature `(pError)` |

**Behavior:**

- Generates the DDL via `generateCreateTableStatement()`
- Executes it against the pool
- If the table already exists, logs a warning and continues (no error)
- Other errors are passed to the callback

### createTables(pMeadowSchema, fCallback)

Creates all tables in a Meadow schema sequentially.

```javascript
_Fable.MeadowMySQLProvider.createTables(fullSchema,
    (pError) =>
    {
        if (pError) console.error(pError);
    });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowSchema` | object | Schema with a `Tables` array of table schemas |
| `fCallback` | function | Callback with signature `(pError)` |

Tables are created one at a time using `fable.Utility.eachLimit()` with a concurrency of 1.

### generateDropTableStatement(pTableName)

Generates a DROP TABLE IF EXISTS statement.

```javascript
let tmpSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');
// 'DROP TABLE IF EXISTS Book;'
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pTableName` | string | The table name to drop |

**Returns:** A string containing the DROP TABLE DDL.

## Configuration Reference

### PascalCase format (Fable settings)

```json
{
    "MySQL": {
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

### camelCase format (direct mysql2)

```json
{
    "MySQL": {
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

## Multiple Instances

You can create multiple connection pools for different databases:

```javascript
_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider',
    { MySQL: { host: 'primary-db', ... } }, 'Primary');

_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider',
    { MySQL: { host: 'analytics-db', ... } }, 'Analytics');

// Access by hash
_Fable.servicesMap.MeadowConnectionMySQL['Primary'].connect();
_Fable.servicesMap.MeadowConnectionMySQL['Analytics'].connect();
```
