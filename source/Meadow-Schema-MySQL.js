/**
* Meadow MySQL Schema Provider
*
* Handles table creation, dropping, and DDL generation for MySQL.
* Separated from the connection provider to allow independent extension
* for indexing, foreign keys, and other schema operations.
*
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class MeadowSchemaMySQL extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'MeadowSchemaMySQL';

		// Reference to the connection pool, set by the connection provider
		this._ConnectionPool = false;
	}

	/**
	 * Set the connection pool reference for executing DDL statements.
	 * @param {object} pConnectionPool - MySQL connection pool
	 * @returns {MeadowSchemaMySQL} this (for chaining)
	 */
	setConnectionPool(pConnectionPool)
	{
		this._ConnectionPool = pConnectionPool;
		return this;
	}

	generateDropTableStatement(pTableName)
	{
		return `DROP TABLE IF EXISTS ${pTableName};`;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema} ...`);

		let tmpPrimaryKey = false;
		let tmpCreateTableStatement = `--   [ ${pMeadowTableSchema.TableName} ]`;

		tmpCreateTableStatement += `\nCREATE TABLE IF NOT EXISTS \n    ${pMeadowTableSchema.TableName}\n    (`;
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			// If we aren't the first column, append a comma.
			if (j > 0)
			{
				tmpCreateTableStatement += `,`;
			}

			tmpCreateTableStatement += `\n`;
			// Dump out each column......
			switch (tmpColumn.DataType)
			{
				case 'ID':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INT UNSIGNED NOT NULL AUTO_INCREMENT`;
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'GUID':
					let tmpSize = tmpColumn.hasOwnProperty('Size') ? tmpColumn.Size : 36;
					if (isNaN(tmpSize))
					{
						// Use the old default if Size is improper
						tmpSize = 36;
					}
					tmpCreateTableStatement += `        ${tmpColumn.Column} CHAR(${tmpSize}) DEFAULT '0xDe'`;
					break;
				case 'ForeignKey':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INT UNSIGNED NOT NULL DEFAULT '0'`;
					break;
				case 'Numeric':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INT NOT NULL DEFAULT '0'`;
					break;
				case 'Decimal':
					tmpCreateTableStatement += `        ${tmpColumn.Column} DECIMAL(${tmpColumn.Size})`;
					break;
				case 'String':
					tmpCreateTableStatement += `        ${tmpColumn.Column} CHAR(${tmpColumn.Size}) NOT NULL DEFAULT ''`;
					break;
				case 'Text':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT`;
					break;
				case 'DateTime':
					tmpCreateTableStatement += `        ${tmpColumn.Column} DATETIME`;
					break;
				case 'Boolean':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TINYINT NOT NULL DEFAULT '0'`;
					break;
				case 'JSON':
					tmpCreateTableStatement += `        ${tmpColumn.Column} LONGTEXT`;
					break;
				case 'JSONProxy':
					tmpCreateTableStatement += `        ${tmpColumn.StorageColumn} LONGTEXT`;
					break;
				default:
					break;
			}
		}
		if (tmpPrimaryKey)
		{
							tmpCreateTableStatement += `,\n\n        PRIMARY KEY (${tmpPrimaryKey})`;
		}
		tmpCreateTableStatement += `\n    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

		return tmpCreateTableStatement;
	}

	createTables(pMeadowSchema, fCallback)
	{
		// Now create the Book databases if they don't exist.
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createTable(pTable, fCreateComplete)
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-MySQL Error creating tables from Schema: ${pCreateError}`,pCreateError);
				}
				this.log.info('Done creating tables!');
				return fCallback(pCreateError);
			});
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		let tmpCreateTableStatement = this.generateCreateTableStatement(pMeadowTableSchema);
		this._ConnectionPool.query(tmpCreateTableStatement,
			function(pError, pRows, pFields)
			{
				if (pError)
				{
					if (pError.hasOwnProperty('originalError')
						&& (pError.originalError.hasOwnProperty('info'))
						// TODO: Validate that there isn't a better way to find this (pError.code isn't explicit enough)
						&& (pError.originalError.info.message.indexOf("There is already an object named") == 0)
						&& (pError.originalError.info.message.indexOf('in the database.') > 0))
					{
						// The table already existed; log a warning but keep on keeping on.
						this.log.warn(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} executed but table already existed.`);
						return fCallback();
					}
					else
					{
						this.log.error(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
						return fCallback(pError);
					}
				}
				else
				{
					this.log.info(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} executed successfully.`);
					return fCallback();
				}
			}.bind(this));
	}

	// ========================================================================
	// Index Generation
	// ========================================================================

	/**
	 * Derive index definitions from a Meadow table schema.
	 *
	 * Automatically generates indices for:
	 *   - GUID columns      -> unique index  AK_M_{Column}
	 *   - ForeignKey columns -> regular index IX_M_{Column}
	 *
	 * Column-level Indexed property:
	 *   - Indexed: true     -> regular index IX_M_T_{Table}_C_{Column}
	 *   - Indexed: 'unique' -> unique index  AK_M_T_{Table}_C_{Column}
	 *   - IndexName overrides the auto-generated name (for round-trip fidelity)
	 *
	 * Also includes any explicit entries from pMeadowTableSchema.Indices[]
	 * (for multi-column composite indices).
	 *
	 * Each index definition is:
	 *   { Name, TableName, Columns[], Unique, Strategy }
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of index definition objects
	 */
	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		let tmpIndices = [];
		let tmpTableName = pMeadowTableSchema.TableName;

		// Auto-detect from column types
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			switch (tmpColumn.DataType)
			{
				case 'GUID':
					tmpIndices.push(
						{
							Name: `AK_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: true,
							Strategy: ''
						});
					break;
				case 'ForeignKey':
					tmpIndices.push(
						{
							Name: `IX_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: false,
							Strategy: ''
						});
					break;
				default:
					// Column-level Indexed property: generates a single-column index
					// with a consistent naming convention.
					//   Indexed: true     -> IX_M_T_{Table}_C_{Column}  (regular)
					//   Indexed: 'unique' -> AK_M_T_{Table}_C_{Column}  (unique)
					// Optional IndexName property overrides the auto-generated name.
					if (tmpColumn.Indexed)
					{
						let tmpIsUnique = (tmpColumn.Indexed === 'unique');
						let tmpPrefix = tmpIsUnique ? 'AK_M_T' : 'IX_M_T';
						let tmpAutoName = `${tmpPrefix}_${tmpTableName}_C_${tmpColumn.Column}`;
						tmpIndices.push(
							{
								Name: tmpColumn.IndexName || tmpAutoName,
								TableName: tmpTableName,
								Columns: [tmpColumn.Column],
								Unique: tmpIsUnique,
								Strategy: ''
							});
					}
					break;
			}
		}

		// Include any explicitly defined indices on the schema
		if (Array.isArray(pMeadowTableSchema.Indices))
		{
			for (let k = 0; k < pMeadowTableSchema.Indices.length; k++)
			{
				let tmpExplicitIndex = pMeadowTableSchema.Indices[k];
				tmpIndices.push(
					{
						Name: tmpExplicitIndex.Name || `IX_${tmpTableName}_${k}`,
						TableName: tmpTableName,
						Columns: Array.isArray(tmpExplicitIndex.Columns) ? tmpExplicitIndex.Columns : [tmpExplicitIndex.Columns],
						Unique: tmpExplicitIndex.Unique || false,
						Strategy: tmpExplicitIndex.Strategy || ''
					});
			}
		}

		return tmpIndices;
	}

	/**
	 * Build the column list for an index, backtick-quoted and comma-separated.
	 * @param {Array} pColumns - Array of column name strings
	 * @returns {string}
	 */
	_buildColumnList(pColumns)
	{
		return pColumns.map((pCol) => { return '`' + pCol + '`'; }).join(', ');
	}

	/**
	 * Generate a full idempotent SQL script for creating all indices on a table.
	 *
	 * Uses INFORMATION_SCHEMA.STATISTICS to check for existing indices before
	 * creating them, wrapped in prepared statements for safe repeated execution.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {string} Complete SQL script
	 */
	generateCreateIndexScript(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpTableName = pMeadowTableSchema.TableName;

		if (tmpIndices.length === 0)
		{
			return `-- No indices to create for ${tmpTableName}\n`;
		}

		let tmpScript = `-- Index Definitions for ${tmpTableName} -- Generated ${new Date().toJSON()}\n\n`;

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';
			let tmpStrategyClause = tmpIndex.Strategy ? ` USING ${tmpIndex.Strategy}` : '';
			let tmpCreateStatement = `${tmpCreateKeyword} ${tmpIndex.Name} ON ${tmpIndex.TableName}(${tmpColumnList})${tmpStrategyClause}`;

			tmpScript += `-- Index: ${tmpIndex.Name}\n`;
			tmpScript += `SET @tmpQuery =\n`;
			tmpScript += `  (\n`;
			tmpScript += `    SELECT IF\n`;
			tmpScript += `    (\n`;
			tmpScript += `      (\n`;
			tmpScript += `        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = '${tmpIndex.TableName}'\n`;
			tmpScript += `        AND table_schema = DATABASE() AND index_name = '${tmpIndex.Name}'\n`;
			tmpScript += `      ) > 0,\n`;
			tmpScript += `      "SELECT 1",\n`;
			tmpScript += `      "${tmpCreateStatement}"\n`;
			tmpScript += `    )\n`;
			tmpScript += `  );\n`;
			tmpScript += `PREPARE tmpQueryStatement FROM @tmpQuery;\n`;
			tmpScript += `EXECUTE tmpQueryStatement;\n\n`;
		}

		return tmpScript;
	}

	/**
	 * Generate an array of individual CREATE INDEX SQL statements for a table.
	 *
	 * Each entry is an object with:
	 *   { Name, Statement, CheckStatement }
	 *
	 * - Statement: the raw CREATE [UNIQUE] INDEX ... SQL
	 * - CheckStatement: a SELECT against INFORMATION_SCHEMA.STATISTICS that
	 *   returns the count of matching indices (0 = does not exist)
	 *
	 * This is the programmatic approach: the caller can run CheckStatement
	 * first, then conditionally run Statement.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of { Name, Statement, CheckStatement } objects
	 */
	generateCreateIndexStatements(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpStatements = [];

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';
			let tmpStrategyClause = tmpIndex.Strategy ? ` USING ${tmpIndex.Strategy}` : '';

			tmpStatements.push(
				{
					Name: tmpIndex.Name,
					Statement: `${tmpCreateKeyword} ${tmpIndex.Name} ON ${tmpIndex.TableName}(${tmpColumnList})${tmpStrategyClause}`,
					CheckStatement: `SELECT COUNT(*) AS IndexExists FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = '${tmpIndex.TableName}' AND table_schema = DATABASE() AND index_name = '${tmpIndex.Name}'`
				});
		}

		return tmpStatements;
	}

	/**
	 * Programmatically create a single index on the database.
	 *
	 * Checks INFORMATION_SCHEMA.STATISTICS first; only runs CREATE INDEX
	 * if the index does not yet exist.
	 *
	 * @param {object} pIndexStatement - Object from generateCreateIndexStatements()
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndex(pIndexStatement, fCallback)
	{
		if (!this._ConnectionPool)
		{
			this.log.error(`Meadow-MySQL CREATE INDEX ${pIndexStatement.Name} failed: not connected.`);
			return fCallback(new Error('Not connected to MySQL'));
		}

		// First check if the index already exists
		this._ConnectionPool.query(pIndexStatement.CheckStatement,
			(pCheckError, pCheckRows) =>
			{
				if (pCheckError)
				{
					this.log.error(`Meadow-MySQL CHECK INDEX ${pIndexStatement.Name} failed!`, pCheckError);
					return fCallback(pCheckError);
				}

				let tmpExists = pCheckRows && pCheckRows[0] && pCheckRows[0].IndexExists > 0;

				if (tmpExists)
				{
					this.log.info(`Meadow-MySQL INDEX ${pIndexStatement.Name} already exists, skipping.`);
					return fCallback();
				}

				// Index does not exist; create it
				this._ConnectionPool.query(pIndexStatement.Statement,
					(pCreateError) =>
					{
						if (pCreateError)
						{
							this.log.error(`Meadow-MySQL CREATE INDEX ${pIndexStatement.Name} failed!`, pCreateError);
							return fCallback(pCreateError);
						}
						this.log.info(`Meadow-MySQL CREATE INDEX ${pIndexStatement.Name} executed successfully.`);
						return fCallback();
					});
			});
	}

	/**
	 * Programmatically create all indices for a single table.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndices(pMeadowTableSchema, fCallback)
	{
		let tmpStatements = this.generateCreateIndexStatements(pMeadowTableSchema);

		if (tmpStatements.length === 0)
		{
			this.log.info(`No indices to create for ${pMeadowTableSchema.TableName}.`);
			return fCallback();
		}

		this.fable.Utility.eachLimit(tmpStatements, 1,
			(pStatement, fCreateComplete) =>
			{
				return this.createIndex(pStatement, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-MySQL Error creating indices for ${pMeadowTableSchema.TableName}: ${pCreateError}`, pCreateError);
				}
				else
				{
					this.log.info(`Done creating indices for ${pMeadowTableSchema.TableName}!`);
				}
				return fCallback(pCreateError);
			});
	}

	/**
	 * Programmatically create all indices for all tables in a schema.
	 *
	 * @param {object} pMeadowSchema - Meadow schema object with Tables array
	 * @param {Function} fCallback - callback(pError)
	 */
	createAllIndices(pMeadowSchema, fCallback)
	{
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createIndices(pTable, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-MySQL Error creating indices from schema: ${pCreateError}`, pCreateError);
				}
				this.log.info('Done creating all indices!');
				return fCallback(pCreateError);
			});
	}

	// ========================================================================
	// Database Introspection
	// ========================================================================

	/**
	 * List all user tables in the connected MySQL database.
	 *
	 * @param {Function} fCallback - callback(pError, pTableNames)
	 */
	listTables(fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to MySQL'));
		}

		this._ConnectionPool.query(
			"SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
			(pError, pRows) =>
			{
				if (pError)
				{
					this.log.error('Meadow-MySQL listTables failed!', pError);
					return fCallback(pError);
				}
				let tmpNames = pRows.map((pRow) => { return pRow.TABLE_NAME; });
				return fCallback(null, tmpNames);
			});
	}

	/**
	 * Map a MySQL native type to a Meadow DataType.
	 *
	 * Uses conservative heuristics:
	 *   1. Primary key with AUTO_INCREMENT → ID
	 *   2. Column name contains "GUID" and type is CHAR/VARCHAR → GUID
	 *   3. Foreign key constraint exists → ForeignKey
	 *   4. Native type mapping for straightforward cases
	 *
	 * @param {object} pColumnInfo - INFORMATION_SCHEMA.COLUMNS row
	 * @param {boolean} pIsAutoIncrement - Whether this column has AUTO_INCREMENT
	 * @param {Set} pForeignKeyColumns - Set of column names that have FK constraints
	 * @returns {object} { DataType, Size }
	 */
	_mapMySQLTypeToMeadow(pColumnInfo, pIsAutoIncrement, pForeignKeyColumns)
	{
		let tmpName = pColumnInfo.COLUMN_NAME;
		let tmpType = (pColumnInfo.DATA_TYPE || '').toUpperCase().trim();

		// Priority 1: Primary key with auto-increment → ID
		if (pColumnInfo.COLUMN_KEY === 'PRI' && pIsAutoIncrement)
		{
			return { DataType: 'ID', Size: '' };
		}

		// Priority 2: Column name contains "GUID" and type is CHAR/VARCHAR → GUID
		if (tmpName.toUpperCase().indexOf('GUID') >= 0 && (tmpType === 'CHAR' || tmpType === 'VARCHAR'))
		{
			return { DataType: 'GUID', Size: pColumnInfo.CHARACTER_MAXIMUM_LENGTH ? String(pColumnInfo.CHARACTER_MAXIMUM_LENGTH) : '' };
		}

		// Priority 3: Has FK constraint → ForeignKey
		if (pForeignKeyColumns && pForeignKeyColumns.has(tmpName))
		{
			return { DataType: 'ForeignKey', Size: '' };
		}

		// Priority 4: Native type mapping
		if (tmpType === 'DECIMAL' || tmpType === 'NUMERIC')
		{
			let tmpSize = '';
			if (pColumnInfo.NUMERIC_PRECISION)
			{
				tmpSize = String(pColumnInfo.NUMERIC_PRECISION);
				if (pColumnInfo.NUMERIC_SCALE && pColumnInfo.NUMERIC_SCALE > 0)
				{
					tmpSize += ',' + String(pColumnInfo.NUMERIC_SCALE);
				}
			}
			return { DataType: 'Decimal', Size: tmpSize };
		}

		if (tmpType === 'DOUBLE' || tmpType === 'FLOAT' || tmpType === 'REAL')
		{
			return { DataType: 'Decimal', Size: '' };
		}

		if (tmpType === 'DATETIME' || tmpType === 'TIMESTAMP')
		{
			return { DataType: 'DateTime', Size: '' };
		}

		if (tmpType === 'TINYINT')
		{
			// TINYINT(1) or boolean naming hints → Boolean
			let tmpLowerName = tmpName.toLowerCase();
			if (pColumnInfo.CHARACTER_MAXIMUM_LENGTH === 1 ||
				pColumnInfo.NUMERIC_PRECISION === 1 ||
				tmpLowerName.indexOf('is') === 0 || tmpLowerName.indexOf('has') === 0 ||
				tmpLowerName.indexOf('in') === 0 || tmpLowerName === 'deleted' ||
				tmpLowerName === 'active' || tmpLowerName === 'enabled')
			{
				return { DataType: 'Boolean', Size: '' };
			}
			return { DataType: 'Numeric', Size: '' };
		}

		if (tmpType === 'TEXT' || tmpType === 'MEDIUMTEXT' || tmpType === 'LONGTEXT')
		{
			return { DataType: 'Text', Size: '' };
		}

		if (tmpType === 'CHAR' || tmpType === 'VARCHAR')
		{
			let tmpSize = pColumnInfo.CHARACTER_MAXIMUM_LENGTH ? String(pColumnInfo.CHARACTER_MAXIMUM_LENGTH) : '';
			return { DataType: 'String', Size: tmpSize };
		}

		if (tmpType === 'INT' || tmpType === 'INTEGER' || tmpType === 'BIGINT' ||
			tmpType === 'SMALLINT' || tmpType === 'MEDIUMINT')
		{
			return { DataType: 'Numeric', Size: '' };
		}

		// Default fallback
		return { DataType: 'Text', Size: '' };
	}

	/**
	 * Get column definitions for a single table.
	 *
	 * Returns DDL-level column objects with DataType inferred from native types.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pColumns)
	 */
	introspectTableColumns(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to MySQL'));
		}

		// Get columns
		let tmpColumnQuery = `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`;

		// Get foreign keys
		let tmpFKQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`;

		this._ConnectionPool.query(tmpColumnQuery, [pTableName],
			(pError, pColumnRows) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-MySQL introspectTableColumns for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				this._ConnectionPool.query(tmpFKQuery, [pTableName],
					(pFKError, pFKRows) =>
					{
						if (pFKError)
						{
							this.log.error(`Meadow-MySQL introspectTableColumns FK query for ${pTableName} failed!`, pFKError);
							return fCallback(pFKError);
						}

						let tmpFKColumnSet = new Set(pFKRows.map((pRow) => { return pRow.COLUMN_NAME; }));

						let tmpResult = [];
						for (let i = 0; i < pColumnRows.length; i++)
						{
							let tmpCol = pColumnRows[i];
							let tmpIsAutoIncrement = (tmpCol.EXTRA || '').indexOf('auto_increment') >= 0;
							let tmpTypeInfo = this._mapMySQLTypeToMeadow(tmpCol, tmpIsAutoIncrement, tmpFKColumnSet);

							let tmpColumnDef = {
								Column: tmpCol.COLUMN_NAME,
								DataType: tmpTypeInfo.DataType
							};

							if (tmpTypeInfo.Size)
							{
								tmpColumnDef.Size = tmpTypeInfo.Size;
							}

							tmpResult.push(tmpColumnDef);
						}

						return fCallback(null, tmpResult);
					});
			});
	}

	/**
	 * Get raw index definitions for a single table from the database.
	 *
	 * Returns each index as: { Name, Columns[], Unique }
	 * Skips the PRIMARY index.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pIndices)
	 */
	introspectTableIndices(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to MySQL'));
		}

		let tmpQuery = `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX`;

		this._ConnectionPool.query(tmpQuery, [pTableName],
			(pError, pRows) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-MySQL introspectTableIndices for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				// Group by index name
				let tmpIndexMap = {};
				for (let i = 0; i < pRows.length; i++)
				{
					let tmpRow = pRows[i];
					// Skip primary key
					if (tmpRow.INDEX_NAME === 'PRIMARY')
					{
						continue;
					}

					if (!tmpIndexMap[tmpRow.INDEX_NAME])
					{
						tmpIndexMap[tmpRow.INDEX_NAME] = {
							Name: tmpRow.INDEX_NAME,
							Columns: [],
							Unique: tmpRow.NON_UNIQUE === 0
						};
					}
					tmpIndexMap[tmpRow.INDEX_NAME].Columns.push(tmpRow.COLUMN_NAME);
				}

				let tmpIndices = Object.values(tmpIndexMap);
				return fCallback(null, tmpIndices);
			});
	}

	/**
	 * Get foreign key relationships for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pForeignKeys)
	 */
	introspectTableForeignKeys(pTableName, fCallback)
	{
		if (!this._ConnectionPool)
		{
			return fCallback(new Error('Not connected to MySQL'));
		}

		let tmpQuery = `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`;

		this._ConnectionPool.query(tmpQuery, [pTableName],
			(pError, pRows) =>
			{
				if (pError)
				{
					this.log.error(`Meadow-MySQL introspectTableForeignKeys for ${pTableName} failed!`, pError);
					return fCallback(pError);
				}

				let tmpResult = [];
				for (let i = 0; i < pRows.length; i++)
				{
					let tmpRow = pRows[i];
					tmpResult.push(
						{
							Column: tmpRow.COLUMN_NAME,
							ReferencedTable: tmpRow.REFERENCED_TABLE_NAME,
							ReferencedColumn: tmpRow.REFERENCED_COLUMN_NAME
						});
				}

				return fCallback(null, tmpResult);
			});
	}

	/**
	 * Classify an index for round-trip fidelity.
	 *
	 * @param {object} pIndex - { Name, Columns[], Unique }
	 * @param {string} pTableName - Table name for pattern matching
	 * @returns {object} { type, column, indexed, indexName }
	 */
	_classifyIndex(pIndex, pTableName)
	{
		// Multi-column indices always go in Indices[]
		if (pIndex.Columns.length !== 1)
		{
			return { type: 'explicit' };
		}

		let tmpColumn = pIndex.Columns[0];
		let tmpName = pIndex.Name;

		// Check for auto-detected GUID index: AK_M_{Column}
		if (tmpName === `AK_M_${tmpColumn}`)
		{
			return { type: 'guid-auto', column: tmpColumn };
		}

		// Check for auto-detected FK index: IX_M_{Column}
		if (tmpName === `IX_M_${tmpColumn}`)
		{
			return { type: 'fk-auto', column: tmpColumn };
		}

		// Check for auto-generated column-level index: IX_M_T_{Table}_C_{Column}
		let tmpRegularAutoName = `IX_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpRegularAutoName && !pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: true };
		}

		// Check for auto-generated unique column-level index: AK_M_T_{Table}_C_{Column}
		let tmpUniqueAutoName = `AK_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpUniqueAutoName && pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: 'unique' };
		}

		// Any other single-column index → column-level with IndexName
		return {
			type: 'column-named',
			column: tmpColumn,
			indexed: pIndex.Unique ? 'unique' : true,
			indexName: tmpName
		};
	}

	/**
	 * Generate a complete DDL-level schema for a single table.
	 *
	 * Combines introspected columns + indices + foreign keys.
	 * Single-column indices are folded into column Indexed/IndexName properties.
	 * Multi-column indices go in the Indices[] array.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pTableSchema)
	 */
	introspectTableSchema(pTableName, fCallback)
	{
		this.introspectTableColumns(pTableName,
			(pColumnError, pColumns) =>
			{
				if (pColumnError)
				{
					return fCallback(pColumnError);
				}

				this.introspectTableIndices(pTableName,
					(pIndexError, pIndices) =>
					{
						if (pIndexError)
						{
							return fCallback(pIndexError);
						}

						this.introspectTableForeignKeys(pTableName,
							(pFKError, pForeignKeys) =>
							{
								if (pFKError)
								{
									return fCallback(pFKError);
								}

								// Build a column lookup for folding index info
								let tmpColumnMap = {};
								for (let i = 0; i < pColumns.length; i++)
								{
									tmpColumnMap[pColumns[i].Column] = pColumns[i];
								}

								let tmpExplicitIndices = [];

								// Classify and fold each index
								for (let i = 0; i < pIndices.length; i++)
								{
									let tmpClassification = this._classifyIndex(pIndices[i], pTableName);

									switch (tmpClassification.type)
									{
										case 'column-auto':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
											}
											break;
										case 'column-named':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
												tmpColumnMap[tmpClassification.column].IndexName = tmpClassification.indexName;
											}
											break;
										case 'guid-auto':
											// If the column wasn't detected as GUID,
											// upgrade it based on AK_M_{Column} naming evidence.
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'GUID')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'GUID';
											}
											break;
										case 'fk-auto':
											// If the column wasn't detected as ForeignKey
											// (e.g. no REFERENCES constraint), upgrade it
											// based on IX_M_{Column} naming pattern evidence.
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'ForeignKey')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'ForeignKey';
											}
											break;
										case 'explicit':
											tmpExplicitIndices.push(
												{
													Name: pIndices[i].Name,
													Columns: pIndices[i].Columns,
													Unique: pIndices[i].Unique
												});
											break;
									}
								}

								let tmpSchema = {
									TableName: pTableName,
									Columns: pColumns
								};

								if (tmpExplicitIndices.length > 0)
								{
									tmpSchema.Indices = tmpExplicitIndices;
								}

								if (pForeignKeys.length > 0)
								{
									tmpSchema.ForeignKeys = pForeignKeys;
								}

								return fCallback(null, tmpSchema);
							});
					});
			});
	}

	/**
	 * Generate DDL schemas for ALL tables in the database.
	 *
	 * @param {Function} fCallback - callback(pError, { Tables: [...] })
	 */
	introspectDatabaseSchema(fCallback)
	{
		this.listTables(
			(pError, pTableNames) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpTables = [];

				this.fable.Utility.eachLimit(pTableNames, 1,
					(pTableName, fEachComplete) =>
					{
						this.introspectTableSchema(pTableName,
							(pSchemaError, pSchema) =>
							{
								if (pSchemaError)
								{
									return fEachComplete(pSchemaError);
								}
								tmpTables.push(pSchema);
								return fEachComplete();
							});
					},
					(pEachError) =>
					{
						if (pEachError)
						{
							this.log.error('Meadow-MySQL introspectDatabaseSchema failed!', pEachError);
							return fCallback(pEachError);
						}
						return fCallback(null, { Tables: tmpTables });
					});
			});
	}

	/**
	 * Map a DDL DataType to a Meadow Package schema Type.
	 *
	 * @param {string} pDataType - The DDL-level DataType
	 * @param {string} pColumnName - The column name (for magic column detection)
	 * @returns {string} The Meadow Package Type
	 */
	_mapDataTypeToMeadowType(pDataType, pColumnName)
	{
		let tmpLowerName = pColumnName.toLowerCase();

		// Magic column names
		if (tmpLowerName === 'createdate' || tmpLowerName === 'creatingiduser' || tmpLowerName === 'updatingiduser' || tmpLowerName === 'updatedate')
		{
			if (tmpLowerName === 'createdate')
			{
				return 'CreateDate';
			}
			if (tmpLowerName === 'creatingiduser')
			{
				return 'CreateIDUser';
			}
			if (tmpLowerName === 'updatedate')
			{
				return 'UpdateDate';
			}
			if (tmpLowerName === 'updatingiduser')
			{
				return 'UpdateIDUser';
			}
		}

		if (tmpLowerName === 'deleted')
		{
			return 'Deleted';
		}
		if (tmpLowerName === 'deletingiduser')
		{
			return 'DeleteIDUser';
		}
		if (tmpLowerName === 'deletedate')
		{
			return 'DeleteDate';
		}

		switch (pDataType)
		{
			case 'ID':
				return 'AutoIdentity';
			case 'GUID':
				return 'AutoGUID';
			case 'ForeignKey':
				return 'Numeric';
			case 'Numeric':
				return 'Numeric';
			case 'Decimal':
				return 'Numeric';
			case 'String':
				return 'String';
			case 'Text':
				return 'String';
			case 'DateTime':
				return 'DateTime';
			case 'Boolean':
				return 'Boolean';
			case 'JSON':
				return 'JSON';
			case 'JSONProxy':
				return 'JSONProxy';
			default:
				return 'String';
		}
	}

	/**
	 * Get a default value for a given DataType.
	 *
	 * @param {string} pDataType - The DDL-level DataType
	 * @returns {*} The default value
	 */
	_getDefaultValue(pDataType)
	{
		switch (pDataType)
		{
			case 'ID':
				return 0;
			case 'GUID':
				return '';
			case 'ForeignKey':
				return 0;
			case 'Numeric':
				return 0;
			case 'Decimal':
				return 0.0;
			case 'String':
				return '';
			case 'Text':
				return '';
			case 'DateTime':
				return '';
			case 'Boolean':
				return false;
			case 'JSON':
				return {};
			case 'JSONProxy':
				return {};
			default:
				return '';
		}
	}

	/**
	 * Generate a Meadow package JSON for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pPackage)
	 */
	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		this.introspectTableSchema(pTableName,
			(pError, pSchema) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpDefaultIdentifier = '';
				let tmpSchemaEntries = [];
				let tmpDefaultObject = {};

				for (let i = 0; i < pSchema.Columns.length; i++)
				{
					let tmpCol = pSchema.Columns[i];
					let tmpMeadowType = this._mapDataTypeToMeadowType(tmpCol.DataType, tmpCol.Column);

					if (tmpCol.DataType === 'ID')
					{
						tmpDefaultIdentifier = tmpCol.Column;
					}

					let tmpEntry = {
						Column: tmpCol.Column,
						Type: tmpMeadowType
					};

					if (tmpCol.Size)
					{
						tmpEntry.Size = tmpCol.Size;
					}

					tmpSchemaEntries.push(tmpEntry);
					tmpDefaultObject[tmpCol.Column] = this._getDefaultValue(tmpCol.DataType);
				}

				let tmpPackage = {
					Scope: pTableName,
					DefaultIdentifier: tmpDefaultIdentifier,
					Schema: tmpSchemaEntries,
					DefaultObject: tmpDefaultObject
				};

				return fCallback(null, tmpPackage);
			});
	}
}

module.exports = MeadowSchemaMySQL;
