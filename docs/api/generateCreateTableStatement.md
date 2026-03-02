# generateCreateTableStatement(pMeadowTableSchema)

Generates a MySQL `CREATE TABLE IF NOT EXISTS` statement from a Meadow table schema object.

## Signature

```javascript
generateCreateTableStatement(pMeadowTableSchema)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pMeadowTableSchema` | object | Yes | Schema with `TableName` (string) and `Columns` (array) properties |

### Schema Object Format

```javascript
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID', Size: 36 },
		{ Column: 'Title', DataType: 'String', Size: 256 },
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'Synopsis', DataType: 'Text' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
}
```

### Column Object Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Column` | string | Yes | The column name |
| `DataType` | string | Yes | One of: `ID`, `GUID`, `ForeignKey`, `Numeric`, `Decimal`, `String`, `Text`, `DateTime`, `Boolean` |
| `Size` | number or string | Varies | Required for `String`, `Decimal`; optional for `GUID` (defaults to 36) |

## Return Value

A string containing the complete `CREATE TABLE IF NOT EXISTS` SQL statement.

## Type Mapping

| Meadow DataType | MySQL Output | Default Value | Notes |
|-----------------|-------------|---------------|-------|
| `ID` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | -- | Sets PRIMARY KEY |
| `GUID` | `CHAR(Size)` | `'0xDe'` | Size defaults to 36; non-numeric Size falls back to 36 |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `'0'` | Also sets PRIMARY KEY |
| `Numeric` | `INT NOT NULL` | `'0'` | |
| `Decimal` | `DECIMAL(Size)` | -- | Size is the precision spec (e.g. `'10,2'`) |
| `String` | `CHAR(Size) NOT NULL` | `''` | |
| `Text` | `TEXT` | -- | |
| `DateTime` | `DATETIME` | -- | |
| `Boolean` | `TINYINT NOT NULL` | `'0'` | |

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
		{ Column: 'Year', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' }
	]
};

let tmpSQL = _Fable.MeadowMySQLProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpSQL);
```

This produces:

```sql
--   [ Book ]
CREATE TABLE IF NOT EXISTS
    Book
    (
        IDBook INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDBook CHAR(36) DEFAULT '0xDe',
        Title CHAR(256) NOT NULL DEFAULT '',
        Year INT NOT NULL DEFAULT '0',
        Price DECIMAL(10,2),

        PRIMARY KEY (IDBook)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Primary Key Detection

The `ID` and `ForeignKey` data types both set the primary key. If both appear, the last one encountered becomes the primary key column.

## Charset and Collation

All generated tables use `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, which supports the full Unicode range including emoji.

## GUID Size Fallback

If the `Size` property on a GUID column is not a number, it falls back to 36:

```javascript
{ Column: 'GUID', DataType: 'GUID', Size: 'invalid' }
// Produces: GUID CHAR(36) DEFAULT '0xDe'
```

## Related

- [createTable](createTable.md) -- Execute the generated DDL
- [createTables](createTables.md) -- Create multiple tables from a schema
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate DROP TABLE DDL
- [Schema & Table Creation](../schema.md) -- Full walkthrough
