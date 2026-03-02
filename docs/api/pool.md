# pool (getter)

Returns the underlying mysql2 connection pool for direct query access.

## Signature

```javascript
get pool()
```

## Return Value

| Type | Description |
|------|-------------|
| mysql2 Pool | The connection pool instance (after successful `connect()` or `connectAsync()`) |
| `false` | Before connection |

## Basic Usage

```javascript
_Fable.MeadowMySQLProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		let tmpPool = _Fable.MeadowMySQLProvider.pool;

		tmpPool.query('SELECT * FROM Book LIMIT 10',
			(pQueryError, pRows, pFields) =>
			{
				for (let i = 0; i < pRows.length; i++)
				{
					console.log(`[${pRows[i].IDBook}] ${pRows[i].Title}`);
				}
			});
	});
```

## Query Methods

The mysql2 pool exposes these primary methods:

### query(sql, callback)

Execute a SQL query:

```javascript
let tmpPool = _Fable.MeadowMySQLProvider.pool;

tmpPool.query('SELECT COUNT(*) AS Total FROM Book',
	(pError, pRows) =>
	{
		console.log(`Total books: ${pRows[0].Total}`);
	});
```

### query(sql, values, callback)

Execute a parameterized query with named placeholders:

```javascript
tmpPool.query(
	'SELECT * FROM Book WHERE IDAuthor = :authorId AND Year > :year',
	{ authorId: 42, year: 2000 },
	(pError, pRows) =>
	{
		console.log(`Found ${pRows.length} books.`);
	});
```

Named placeholders (`:paramName`) are always enabled because the constructor forces `namedPlaceholders: true`.

### execute(sql, values, callback)

Use prepared statements for repeated queries:

```javascript
tmpPool.execute(
	'SELECT * FROM Book WHERE IDAuthor = :authorId',
	{ authorId: 42 },
	(pError, pRows) =>
	{
		console.log(`Found ${pRows.length} books.`);
	});
```

### getConnection(callback)

Acquire a dedicated connection from the pool for transactions or multi-statement operations:

```javascript
tmpPool.getConnection(
	(pError, pConnection) =>
	{
		if (pError) { return; }

		pConnection.beginTransaction(
			(pTxError) =>
			{
				if (pTxError) { pConnection.release(); return; }

				pConnection.query('INSERT INTO Book SET ?', { Title: 'New Book' },
					(pInsertError) =>
					{
						if (pInsertError)
						{
							pConnection.rollback(() => { pConnection.release(); });
							return;
						}
						pConnection.commit(() => { pConnection.release(); });
					});
			});
	});
```

Always call `pConnection.release()` to return the connection to the pool.

## Checking Connection State

Always verify the pool is available before using it:

```javascript
let tmpPool = _Fable.MeadowMySQLProvider.pool;
if (!tmpPool)
{
	console.error('Not connected to MySQL.');
	return;
}

// Safe to use tmpPool here
```

Or check the `connected` property:

```javascript
if (!_Fable.MeadowMySQLProvider.connected)
{
	console.error('Not connected.');
	return;
}

let tmpPool = _Fable.MeadowMySQLProvider.pool;
```

## Related

- [connect](connect.md) -- Create the connection pool
- [connectAsync](connectAsync.md) -- Async connection with callback
