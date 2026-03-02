# createTables(pMeadowSchema, fCallback)

Creates all tables defined in a Meadow schema object by calling `createTable()` for each table sequentially.

## Signature

```javascript
createTables(pMeadowSchema, fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowSchema` | object | Yes | Schema with a `Tables` array of table schema objects |
| `fCallback` | function | Yes | Callback with signature `(pError)` |

### Schema Object Format

```javascript
{
	Tables:
	[
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'Name', DataType: 'String', Size: 200 }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'Title', DataType: 'String', Size: 256 },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		}
	]
}
```

## Return Value

None (result provided via callback).

## Behavior

1. Iterates `pMeadowSchema.Tables` using `fable.Utility.eachLimit()` with a concurrency of 1 (serial)
2. Calls `createTable()` for each table in the array
3. If any table creation fails, logs the error and passes it to the final callback
4. On completion, logs a success message and calls `fCallback()`

## Basic Usage

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
				{ Column: 'Name', DataType: 'String', Size: 200 },
				{ Column: 'Bio', DataType: 'Text' }
			]
		},
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'GUIDBook', DataType: 'GUID', Size: 36 },
				{ Column: 'Title', DataType: 'String', Size: 256 },
				{ Column: 'Year', DataType: 'Numeric' },
				{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		},
		{
			TableName: 'Review',
			Columns:
			[
				{ Column: 'IDReview', DataType: 'ID' },
				{ Column: 'GUIDReview', DataType: 'GUID', Size: 36 },
				{ Column: 'IDBook', DataType: 'ForeignKey' },
				{ Column: 'Rating', DataType: 'Numeric' },
				{ Column: 'Body', DataType: 'Text' },
				{ Column: 'ReviewDate', DataType: 'DateTime' }
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

## Serial Execution

Tables are created one at a time (concurrency of 1). This avoids race conditions with foreign key constraints and ensures predictable execution order. The tables are created in the order they appear in the `Tables` array.

## Error Handling

If a table creation fails with an error other than "table already exists", execution stops and the error is passed to the callback. Tables created before the failure remain in the database.

## Related

- [createTable](createTable.md) -- Create a single table
- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [Schema & Table Creation](../schema.md) -- Full walkthrough
