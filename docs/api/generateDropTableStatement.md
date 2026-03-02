# generateDropTableStatement(pTableName)

Generates a `DROP TABLE IF EXISTS` SQL statement for the given table name.

## Signature

```javascript
generateDropTableStatement(pTableName)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pTableName` | string | Yes | The name of the table to drop |

## Return Value

A string containing the `DROP TABLE IF EXISTS` SQL statement.

## Basic Usage

```javascript
let tmpSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');
console.log(tmpSQL);
// => 'DROP TABLE IF EXISTS Book;'
```

## Executing the Statement

This method only generates the SQL string -- it does not execute it. Run it against the pool yourself:

```javascript
let tmpDropSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');

_Fable.MeadowMySQLProvider.pool.query(tmpDropSQL,
	(pError) =>
	{
		if (pError)
		{
			console.error('Drop failed:', pError);
			return;
		}
		console.log('Table dropped.');
	});
```

## Recreating a Table

Combine with `createTable()` to drop and recreate a table:

```javascript
let tmpDropSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');

_Fable.MeadowMySQLProvider.pool.query(tmpDropSQL,
	(pDropError) =>
	{
		if (pDropError) { console.error(pDropError); return; }

		_Fable.MeadowMySQLProvider.createTable(tmpBookSchema,
			(pCreateError) =>
			{
				if (pCreateError) { console.error(pCreateError); return; }
				console.log('Table recreated.');
			});
	});
```

## IF EXISTS Safety

The `IF EXISTS` clause prevents errors when dropping a table that does not exist. The statement succeeds silently in that case.

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate CREATE TABLE DDL
- [createTable](createTable.md) -- Create a table from schema
- [pool](pool.md) -- Execute queries directly
