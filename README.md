# Meadow Connection MySQL

A MySQL connection pool provider for the Meadow ORM. Wraps [mysql2](https://github.com/sidorares/node-mysql2) as a Fable service, providing connection pooling with named placeholders, auto-connect support, and DDL generation from Meadow table schemas.

[![Build Status](https://github.com/stevenvelozo/meadow-connection-mysql/workflows/Meadow-Connection-MySQL/badge.svg)](https://github.com/stevenvelozo/meadow-connection-mysql/actions)
[![npm version](https://badge.fury.io/js/meadow-connection-mysql.svg)](https://badge.fury.io/js/meadow-connection-mysql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **MySQL2 Connection Pooling** -- High-performance pooled connections via [mysql2](https://github.com/sidorares/node-mysql2)
- **Fable Service Provider** -- Registers with a Fable instance for dependency injection, logging, and configuration
- **Named Placeholders** -- Automatically enables named placeholders for parameterized queries
- **Auto-Connect** -- Optional automatic connection on instantiation via the `MeadowConnectionMySQLAutoConnect` flag
- **Schema-Driven DDL** -- Generates `CREATE TABLE IF NOT EXISTS` statements from Meadow table schemas with primary keys, UTF-8 charset, and proper column types
- **Connection Safety** -- Guards against creating duplicate connection pools with descriptive logging (passwords are never leaked)
- **Settings Coercion** -- Accepts both Meadow-style (`Server`, `Port`, `User`) and mysql2-native (`host`, `port`, `user`) configuration formats

## Installation

```bash
npm install meadow-connection-mysql
```

## Quick Start

```javascript
const libFable = require('fable');
const MeadowConnectionMySQL = require('meadow-connection-mysql');

let fable = new libFable(
{
	MySQL:
	{
		Server: '127.0.0.1',
		Port: 3306,
		User: 'root',
		Password: 'PASSWORD',
		Database: 'my_app',
		ConnectionPoolLimit: 20
	},
	MeadowConnectionMySQLAutoConnect: true
});

fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider',
	MeadowConnectionMySQL);

// Query using the connection pool
fable.MeadowMySQLProvider.pool.query('SELECT * FROM Book LIMIT 10',
	(pError, pRows, pFields) =>
	{
		console.log(`Found ${pRows.length} books.`);
	});
```

## Configuration

The MySQL connection settings can be provided through Fable settings or the service provider options.

### Via Fable Settings

```javascript
let fable = new libFable(
{
	MySQL:
	{
		Server: '127.0.0.1',
		Port: 3306,
		User: 'root',
		Password: 'PASSWORD',
		Database: 'my_app',
		ConnectionPoolLimit: 20
	}
});
```

### Via Provider Options

```javascript
let connection = fable.instantiateServiceProvider('MeadowConnectionMySQL',
{
	MySQL:
	{
		host: '127.0.0.1',
		port: 3306,
		user: 'root',
		password: 'PASSWORD',
		database: 'my_app',
		connectionLimit: 20
	}
}, MeadowConnectionMySQL);
```

Both Meadow-style property names (`Server`, `Port`, `User`, `Password`, `Database`, `ConnectionPoolLimit`) and mysql2-native names (`host`, `port`, `user`, `password`, `database`, `connectionLimit`) are supported. The provider automatically coerces the Meadow format to the mysql2 format.

### Auto-Connect

Set `MeadowConnectionMySQLAutoConnect` to `true` in either Fable settings or provider options to connect automatically on instantiation:

```javascript
let fable = new libFable(
{
	MySQL: { /* ... */ },
	MeadowConnectionMySQLAutoConnect: true
});
```

## API

### `connect()`

Create the MySQL connection pool synchronously. Guards against double-connect — calling `connect()` on an already-connected instance logs an error and skips pool creation.

### `connectAsync(fCallback)`

Async wrapper around `connect()` for consistency with other Meadow connection providers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `Function` | Callback receiving `(error, connectionPool)` |

### `pool` (getter)

Returns the underlying `mysql2` connection pool for direct query access.

### `connected` (property)

Boolean indicating whether the connection pool has been created.

### `generateCreateTableStatement(pMeadowTableSchema)`

Generate a `CREATE TABLE IF NOT EXISTS` SQL statement from a Meadow table schema object. Tables are created with `utf8mb4` charset and `utf8mb4_unicode_ci` collation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `Object` | Meadow table schema with `TableName` and `Columns` array |

### `createTable(pMeadowTableSchema, fCallback)`

Execute a `CREATE TABLE` statement against the connected database.

### `createTables(pMeadowSchema, fCallback)`

Create all tables defined in a Meadow schema object (iterates `pMeadowSchema.Tables` sequentially).

### `generateDropTableStatement(pTableName)`

Generate a `DROP TABLE IF EXISTS` SQL statement for the given table name.

## Column Type Mapping

| Meadow Type | MySQL Column |
|-------------|--------------|
| `ID` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` (with `PRIMARY KEY`) |
| `GUID` | `CHAR(size)` with default GUID (size defaults to 36) |
| `ForeignKey` | `INT UNSIGNED NOT NULL DEFAULT '0'` |
| `Numeric` | `INT NOT NULL DEFAULT '0'` |
| `Decimal` | `DECIMAL(size)` |
| `String` | `CHAR(size) NOT NULL DEFAULT ''` |
| `Text` | `TEXT` |
| `DateTime` | `DATETIME` |
| `Boolean` | `TINYINT NOT NULL DEFAULT '0'` |

## Part of the Retold Framework

Meadow Connection MySQL is a database connector for the Meadow data access layer:

- [meadow](https://github.com/stevenvelozo/meadow) -- ORM and data access framework
- [foxhound](https://github.com/stevenvelozo/foxhound) -- Query DSL used by Meadow
- [stricture](https://github.com/stevenvelozo/stricture) -- Schema definition tool
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) -- RESTful endpoint generation
- [meadow-connection-mssql](https://github.com/stevenvelozo/meadow-connection-mssql) -- MSSQL connector
- [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) -- SQLite connector
- [fable](https://github.com/stevenvelozo/fable) -- Application services framework

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run coverage
```

## Related Packages

- [meadow](https://github.com/stevenvelozo/meadow) -- Data access and ORM
- [meadow-connection-rocksdb](https://github.com/stevenvelozo/meadow-connection-rocksdb) -- RocksDB connection provider
- [fable](https://github.com/stevenvelozo/fable) -- Application services framework

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
