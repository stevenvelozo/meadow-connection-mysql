# Schema & Table Creation

Meadow Connection MySQL can generate and execute CREATE TABLE statements from Meadow schema definitions. This lets you bootstrap a database directly from your model without writing DDL by hand.

## Generating a CREATE TABLE Statement

Pass a Meadow table schema object to `generateCreateTableStatement()`:

```javascript
let tmpSchema = {
    TableName: 'Book',
    Columns: [
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
};

let tmpSQL = _Fable.MeadowMySQLProvider.generateCreateTableStatement(tmpSchema);
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
        Synopsis TEXT,
        PublishDate DATETIME,
        InPrint TINYINT NOT NULL DEFAULT '0',
        IDAuthor INT UNSIGNED NOT NULL DEFAULT '0',

        PRIMARY KEY (IDAuthor)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Meadow Data Types

| Meadow Type | MySQL Type | Default | Notes |
|-------------|-----------|---------|-------|
| `ID` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | -- | Sets primary key |
| `GUID` | `CHAR(Size)` | `'0xDe'` | Size defaults to 36 if omitted |
| `ForeignKey` | `INT UNSIGNED NOT NULL` | `'0'` | Also sets primary key |
| `Numeric` | `INT NOT NULL` | `'0'` | |
| `Decimal` | `DECIMAL(Size)` | -- | Size is the precision spec (e.g. `'10,2'`) |
| `String` | `CHAR(Size) NOT NULL` | `''` | |
| `Text` | `TEXT` | -- | |
| `DateTime` | `DATETIME` | -- | |
| `Boolean` | `TINYINT NOT NULL` | `'0'` | |

All tables are created with `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

## Creating a Single Table

Execute the CREATE TABLE against the connected pool:

```javascript
_Fable.MeadowMySQLProvider.createTable(tmpSchema,
    (pError) =>
    {
        if (pError) return console.error(pError);
        console.log('Table created.');
    });
```

If the table already exists, the error is caught and logged as a warning -- execution continues without failing.

## Creating Multiple Tables

Pass a full Meadow schema (with a `Tables` array) to create all tables sequentially:

```javascript
let tmpFullSchema = {
    Tables: [
        { TableName: 'Author', Columns: [...] },
        { TableName: 'Book', Columns: [...] },
        { TableName: 'BookAuthorJoin', Columns: [...] }
    ]
};

_Fable.MeadowMySQLProvider.createTables(tmpFullSchema,
    (pError) =>
    {
        if (pError) return console.error(pError);
        console.log('All tables created.');
    });
```

Tables are created one at a time (serial, not parallel) to avoid issues with foreign key ordering.

## Dropping a Table

Generate a DROP TABLE statement:

```javascript
let tmpDropSQL = _Fable.MeadowMySQLProvider.generateDropTableStatement('Book');
// DROP TABLE IF EXISTS Book;
```

This only generates the SQL string -- execute it against the pool yourself:

```javascript
_Fable.MeadowMySQLProvider.pool.query(tmpDropSQL,
    (pError) =>
    {
        if (pError) return console.error(pError);
        console.log('Table dropped.');
    });
```
