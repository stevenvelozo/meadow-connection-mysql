# Quickstart

This guide walks through setting up Meadow Connection MySQL from scratch: install, configure, connect, run queries, create tables from schemas, and integrate with the Meadow ORM.

---

## Prerequisites

- Node.js 14 or later
- A running MySQL or MariaDB server
- A database created and accessible by the configured user

---

## Install

```bash
npm install meadow-connection-mysql fable
```

---

## Step 1: Configure and Connect

The simplest approach uses auto-connect, which creates the connection pool during service instantiation:

```javascript
const libFable = require('fable');
const libMeadowConnectionMySQL = require('meadow-connection-mysql');

let _Fable = new libFable(
	{
		"Product": "BookstoreExample",
		"ProductVersion": "1.0.0",
		"UUID": { "DataCenter": 0, "Worker": 0 },
		"LogStreams": [{ "streamtype": "console" }],
		"MySQL":
		{
			"Server": "127.0.0.1",
			"Port": 3306,
			"User": "root",
			"Password": "secret",
			"Database": "bookstore",
			"ConnectionPoolLimit": 20
		},
		"MeadowConnectionMySQLAutoConnect": true
	});

_Fable.serviceManager.addAndInstantiateServiceType(
	'MeadowMySQLProvider', libMeadowConnectionMySQL);

// The pool is ready immediately
console.log('Connected:', _Fable.MeadowMySQLProvider.connected);
// => Connected: true
```

---

## Step 2: Run a Query

Use the `pool` getter to access the mysql2 connection pool directly:

```javascript
_Fable.MeadowMySQLProvider.pool.query(
	'SELECT * FROM Book ORDER BY IDBook ASC LIMIT 5',
	(pError, pRows, pFields) =>
	{
		if (pError)
		{
			console.error('Query failed:', pError);
			return;
		}

		for (let i = 0; i < pRows.length; i++)
		{
			console.log(`  [${pRows[i].IDBook}] ${pRows[i].Title}`);
		}
	});
```

Named placeholders are enabled automatically, so you can write parameterized queries:

```javascript
_Fable.MeadowMySQLProvider.pool.query(
	'SELECT * FROM Book WHERE IDAuthor = :authorId AND Year > :year',
	{ authorId: 42, year: 2000 },
	(pError, pRows) =>
	{
		console.log(`Found ${pRows.length} books.`);
	});
```

---

## Step 3: Manual Connection

If you need to control when the pool is created, omit the auto-connect flag and call `connect()` or `connectAsync()` yourself:

```javascript
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

// Connect manually
_Fable.MeadowMySQLProvider.connect();
console.log('Connected:', _Fable.MeadowMySQLProvider.connected);
// => Connected: true
```

Or with the async callback form:

```javascript
_Fable.MeadowMySQLProvider.connectAsync(
	(pError, pConnectionPool) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		pConnectionPool.query('SELECT 1',
			(pQueryError, pRows) =>
			{
				console.log('Connected and queried successfully.');
			});
	});
```

---

## Step 4: Per-Instance Configuration

Pass connection settings directly when instantiating the service instead of using Fable settings. This is useful for connecting to multiple databases:

```javascript
let _Fable = new libFable();

_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider',
	{
		MySQL:
		{
			host: '127.0.0.1',
			port: 3306,
			user: 'root',
			password: 'secret',
			database: 'bookstore',
			connectionLimit: 20
		}
	});

_Fable.MeadowMySQLProvider.connect();
```

Both PascalCase (`Server`, `ConnectionPoolLimit`) and camelCase (`host`, `connectionLimit`) property names are accepted. The constructor coerces PascalCase to camelCase automatically.

---

## Step 5: Create Tables from Schema

Define a Meadow table schema and generate the DDL:

```javascript
let tmpBookSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID', Size: 36 },
		{ Column: 'Title', DataType: 'String', Size: 256 },
		{ Column: 'Author', DataType: 'String', Size: 128 },
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Synopsis', DataType: 'Text' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' }
	]
};

// Generate the SQL without executing it
let tmpSQL = _Fable.MeadowMySQLProvider.generateCreateTableStatement(tmpBookSchema);
console.log(tmpSQL);
```

Execute it against the database:

```javascript
_Fable.MeadowMySQLProvider.createTable(tmpBookSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Table creation failed:', pError);
			return;
		}
		console.log('Book table created.');
	});
```

For multiple tables, use `createTables()` with a schema containing a `Tables` array:

```javascript
let tmpFullSchema =
{
	Tables:
	[
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'GUIDAuthor', DataType: 'GUID', Size: 36 },
				{ Column: 'Name', DataType: 'String', Size: 200 }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'GUIDBook', DataType: 'GUID', Size: 36 },
				{ Column: 'Title', DataType: 'String', Size: 256 },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		}
	]
};

_Fable.MeadowMySQLProvider.createTables(tmpFullSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Schema creation failed:', pError);
			return;
		}
		console.log('All tables created.');
	});
```

Tables are created sequentially (one at a time) to avoid foreign key ordering issues.

---

## Step 6: Meadow ORM Integration

With the pool registered, Meadow entities can query through it automatically:

```javascript
const libMeadow = require('meadow');

let tmpBookMeadow = libMeadow.new(_Fable, 'Book')
	.setProvider('MySQL')
	.setDefaultIdentifier('IDBook')
	.setSchema(
		[
			{ Column: 'IDBook', Type: 'AutoIdentity' },
			{ Column: 'GUIDBook', Type: 'AutoGUID' },
			{ Column: 'Title', Type: 'String' },
			{ Column: 'Author', Type: 'String' },
			{ Column: 'CreateDate', Type: 'CreateDate' },
			{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
			{ Column: 'UpdateDate', Type: 'UpdateDate' },
			{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
			{ Column: 'Deleted', Type: 'Deleted' },
			{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
			{ Column: 'DeleteDate', Type: 'DeleteDate' }
		])
	.setDefault(
		{
			IDBook: null,
			GUIDBook: '',
			Title: '',
			Author: '',
			CreateDate: false,
			CreatingIDUser: 0,
			UpdateDate: false,
			UpdatingIDUser: 0,
			Deleted: 0,
			DeletingIDUser: 0,
			DeleteDate: false
		});

// Create a record
let tmpCreateQuery = tmpBookMeadow.query.clone()
	.addRecord({ Title: 'Dune', Author: 'Frank Herbert' });

tmpBookMeadow.doCreate(tmpCreateQuery,
	(pError, pQuery, pQueryRead, pRecord) =>
	{
		console.log(`Created: ${pRecord.Title} (ID: ${pRecord.IDBook})`);

		// Read with filter
		let tmpReadQuery = tmpBookMeadow.query
			.addFilter('Author', '%Herbert%', 'LIKE');

		tmpBookMeadow.doReads(tmpReadQuery,
			(pReadError, pReadQuery, pRecords) =>
			{
				console.log(`Found ${pRecords.length} book(s) by Herbert`);
			});
	});
```

FoxHound generates the SQL queries and Meadow routes them through the registered connection pool automatically.

---

## Summary

| Step | What It Does |
|------|-------------|
| Configure | Set `MySQL` settings in Fable config or provider options |
| Connect | Call `connect()`, `connectAsync()`, or use `MeadowConnectionMySQLAutoConnect` |
| Query | Use `pool.query()` for direct SQL with named placeholders |
| DDL | Generate and execute CREATE TABLE from Meadow schemas |
| Meadow | Set provider to `'MySQL'` and use standard CRUD operations |
