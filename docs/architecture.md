# Architecture

Meadow Connection MySQL bridges the Meadow data access layer and the MySQL database server. This page documents the component design, data flow, configuration pipeline, and how the connection pool integrates with the broader Retold ecosystem.

---

## System Architecture

```mermaid
graph TB
	subgraph Application
		A[Application Code]
		B[Meadow ORM]
		C[FoxHound Query DSL]
	end

	subgraph MeadowConnectionMySQL["Meadow Connection MySQL"]
		D[MeadowConnectionMySQL Service]
		E[Configuration Coercion]
		F[mysql2 Connection Pool]
	end

	subgraph Database["MySQL Server"]
		G[MySQL / MariaDB]
	end

	A -->|doCreate / doRead / doUpdate / doDelete| B
	B -->|setProvider MySQL| C
	C -->|SQL + Parameters| D
	D -->|Settings| E
	E -->|Coerced Config| F
	F -->|TCP Connections| G

	style MeadowConnectionMySQL fill:#e8f4f8,stroke:#2E7D74,stroke-width:2px
	style Application fill:#f5f0e8,stroke:#423D37,stroke-width:1px
	style Database fill:#fef3e2,stroke:#c97a2e,stroke-width:1px
```

---

## Component Responsibilities

### MeadowConnectionMySQL Service

The core class, extending `FableServiceProviderBase`. It manages the lifecycle of the mysql2 connection pool:

- **Construction** -- Reads MySQL settings from Fable config or per-instance options, coerces PascalCase to camelCase, forces `namedPlaceholders: true`, optionally auto-connects
- **Pool Management** -- Creates a single mysql2 pool, guards against double-connect, masks passwords in log output
- **DDL Generation** -- Produces `CREATE TABLE IF NOT EXISTS` statements from Meadow table schema objects
- **Table Execution** -- Executes DDL against the pool, handles "already exists" gracefully

### Configuration Coercion

The constructor translates between two naming conventions:

```mermaid
graph LR
	subgraph Meadow Style
		A1["Server"]
		A2["Port"]
		A3["User"]
		A4["Password"]
		A5["Database"]
		A6["ConnectionPoolLimit"]
	end

	subgraph mysql2 Native
		B1["host"]
		B2["port"]
		B3["user"]
		B4["password"]
		B5["database"]
		B6["connectionLimit"]
	end

	A1 --> B1
	A2 --> B2
	A3 --> B3
	A4 --> B4
	A5 --> B5
	A6 --> B6

	style Meadow Style fill:#f5f0e8,stroke:#423D37
	style mysql2 Native fill:#e8f4f8,stroke:#2E7D74
```

The Meadow-style format is the standard convention used across Retold modules. The camelCase format is what mysql2 expects natively. Both are accepted -- the constructor detects which format is present and coerces as needed.

### mysql2 Connection Pool

The underlying pool managed by [mysql2](https://github.com/sidorares/node-mysql2):

- Maintains a set of reusable TCP connections up to the configured `connectionLimit`
- Connections are acquired from the pool for each query and returned automatically
- Named placeholders allow parameterized queries using `:paramName` syntax
- The pool handles connection failures, timeouts, and reconnection internally

---

## Connection Lifecycle

```mermaid
sequenceDiagram
	participant App as Application
	participant Fable as Fable Instance
	participant MCS as MeadowConnectionMySQL
	participant Pool as mysql2 Pool
	participant MySQL as MySQL Server

	App->>Fable: new libFable(config)
	App->>Fable: addServiceType('MeadowMySQLProvider', ...)
	App->>Fable: instantiateServiceProvider('MeadowMySQLProvider')
	Fable->>MCS: constructor(fable, manifest, hash)
	MCS->>MCS: Coerce config (PascalCase → camelCase)
	MCS->>MCS: Force namedPlaceholders = true

	alt Auto-Connect Enabled
		MCS->>MCS: connect()
		MCS->>Pool: mysql2.createPool(settings)
		Pool->>MySQL: Establish TCP connections
		MCS-->>MCS: connected = true
	end

	App->>MCS: connect() or connectAsync()
	MCS->>Pool: mysql2.createPool(settings)
	Pool->>MySQL: Establish TCP connections
	MCS-->>App: Pool ready (callback or sync)

	App->>Pool: pool.query(sql, params, callback)
	Pool->>MySQL: Execute query
	MySQL-->>Pool: Result set
	Pool-->>App: (error, rows, fields)
```

---

## Configuration Pipeline

Settings flow through a priority chain:

1. **Per-instance options** -- Passed as the second argument to `instantiateServiceProvider()`. If the options include a `MySQL` object, it is used directly.
2. **Fable settings** -- If no per-instance `MySQL` object is present, the constructor reads `fable.settings.MySQL` and builds the config from PascalCase properties.
3. **Auto-connect flag** -- Checked in both per-instance options and Fable settings. If `MeadowConnectionMySQLAutoConnect` is true in either location, `connect()` is called during construction.

```mermaid
flowchart TD
	A[Constructor Called] --> B{options.MySQL exists?}
	B -->|Yes| C[Use options.MySQL directly]
	B -->|No| D{fable.settings.MySQL exists?}
	D -->|Yes| E[Build config from fable.settings]
	D -->|No| F[No MySQL config available]
	C --> G{Has PascalCase props?}
	G -->|Yes| H[Coerce to camelCase]
	G -->|No| I[Use as-is]
	H --> J[Force namedPlaceholders = true]
	I --> J
	E --> J
	J --> K{AutoConnect enabled?}
	K -->|Yes| L[Call connect immediately]
	K -->|No| M[Wait for explicit connect call]
```

---

## DDL Generation Flow

The `generateCreateTableStatement()` method walks a Meadow table schema and produces MySQL DDL:

```mermaid
flowchart LR
	A[Meadow Table Schema] --> B[Walk Columns Array]
	B --> C{DataType?}
	C -->|ID| D["INT UNSIGNED NOT NULL AUTO_INCREMENT"]
	C -->|GUID| E["CHAR(Size) DEFAULT '0xDe'"]
	C -->|ForeignKey| F["INT UNSIGNED NOT NULL DEFAULT '0'"]
	C -->|Numeric| G["INT NOT NULL DEFAULT '0'"]
	C -->|Decimal| H["DECIMAL(Size)"]
	C -->|String| I["CHAR(Size) NOT NULL DEFAULT ''"]
	C -->|Text| J["TEXT"]
	C -->|DateTime| K["DATETIME"]
	C -->|Boolean| L["TINYINT NOT NULL DEFAULT '0'"]
	D --> M[Set PRIMARY KEY]
	F --> M
	M --> N["CREATE TABLE IF NOT EXISTS ... utf8mb4"]
```

The `ID` and `ForeignKey` types designate the column as the primary key. The table is always created with `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

---

## Pool Safety

The service includes guards against common connection issues:

### Double-Connect Prevention

```mermaid
flowchart TD
	A[connect called] --> B{Pool already exists?}
	B -->|Yes| C[Log error with cleansed settings]
	C --> D[Skip -- no new pool created]
	B -->|No| E[Create mysql2 pool]
	E --> F[Set connected = true]
	F --> G[Log connection details]
```

If `connect()` is called when a pool already exists, the method logs an error with the connection settings (password masked as `*****************`) and returns without creating a second pool. This prevents connection leaks from accidental double-initialization.

### ConnectAsync Error Handling

The `connectAsync()` method wraps `connect()` in a try-catch:

- If the callback is missing, logs a warning and substitutes a no-op function
- If `connect()` throws, the error is caught and passed to the callback
- If already connected, returns the existing pool without reconnecting

---

## Meadow Integration

When a Meadow entity sets its provider to `'MySQL'`, queries follow this path:

```mermaid
sequenceDiagram
	participant App as Application
	participant Meadow as Meadow Entity
	participant FH as FoxHound
	participant Provider as Meadow-Provider-MySQL
	participant MCS as MeadowConnectionMySQL
	participant Pool as mysql2 Pool

	App->>Meadow: doReads(query, callback)
	Meadow->>FH: Build SQL query
	FH-->>Meadow: SQL string + parameters
	Meadow->>Provider: Execute read
	Provider->>MCS: Get pool reference
	MCS-->>Provider: mysql2 pool
	Provider->>Pool: pool.query(sql, params)
	Pool-->>Provider: Result rows
	Provider-->>Meadow: Marshalled records
	Meadow-->>App: callback(error, query, records)
```

The connection pool is shared across all Meadow entities in the application. Each entity resolves the pool through the Fable service registry, so there is a single pool regardless of how many entity types are in use.

---

## Comparison with Other Connectors

| Feature | MySQL | MSSQL | SQLite | RocksDB |
|---------|-------|-------|--------|---------|
| Connection Type | Pool (TCP) | Pool (TDS) | File handle | File handle |
| Server Required | Yes | Yes | No | No |
| Named Placeholders | Yes | Yes | Yes | N/A |
| Auto-Connect | Yes | No | No | No |
| DDL Generation | Yes | Yes | No | No |
| Config Coercion | PascalCase → camelCase | N/A | N/A | N/A |
| Connection Guard | Double-connect prevention | N/A | N/A | N/A |
| Underlying Library | mysql2 | tedious | better-sqlite3 | rocksdb |
