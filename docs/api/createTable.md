# createTable(pMeadowTableSchema, fCallback)

Generates and executes a `CREATE TABLE IF NOT EXISTS` statement against the connected MySQL pool.

## Signature

```javascript
createTable(pMeadowTableSchema, fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowTableSchema` | object | Yes | Schema with `TableName` and `Columns` array |
| `fCallback` | function | Yes | Callback with signature `(pError)` |

## Return Value

None (result provided via callback).

## Behavior

1. Calls `generateCreateTableStatement(pMeadowTableSchema)` to produce the DDL string
2. Executes the DDL against `this._ConnectionPool` via `pool.query()`
3. On success: logs a success message and calls `fCallback()` with no error
4. On error:
   - If the error indicates the table already exists (detected via `originalError.info.message`), logs a warning and calls `fCallback()` with no error
   - Otherwise logs the error and calls `fCallback(pError)`

## Basic Usage

```javascript
let tmpSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID', Size: 36 },
		{ Column: 'Title', DataType: 'String', Size: 256 },
		{ Column: 'Author', DataType: 'String', Size: 128 },
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' }
	]
};

_Fable.MeadowMySQLProvider.createTable(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Table creation failed:', pError);
			return;
		}
		console.log('Book table created successfully.');
	});
```

## Idempotent Operation

Because the generated DDL uses `CREATE TABLE IF NOT EXISTS`, calling `createTable()` for an existing table does not produce an error. A warning is logged instead:

```
Meadow-MySQL CREATE TABLE Book executed but table already existed.
```

This makes `createTable()` safe to call during application startup without worrying about pre-existing tables.

## Prerequisites

The connection pool must be established before calling `createTable()`:

```javascript
_Fable.MeadowMySQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		_Fable.MeadowMySQLProvider.createTable(tmpSchema,
			(pCreateError) =>
			{
				if (pCreateError) { console.error(pCreateError); }
			});
	});
```

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [createTables](createTables.md) -- Create multiple tables sequentially
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Table Creation](../schema.md) -- Full walkthrough
