/**
* Meadow MySQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libMySQL = require('mysql2');

/*
	Das alt muster:

	{
		connectionLimit: _Fable.settings.MySQL.ConnectionPoolLimit,
		host: _Fable.settings.MySQL.Server,
		port: _Fable.settings.MySQL.Port,
		user: _Fable.settings.MySQL.User,
		password: _Fable.settings.MySQL.Password,
		database: _Fable.settings.MySQL.Database,
		namedPlaceholders: true
	}
*/

class MeadowConnectionMySQL extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionMySQL'

		// See if the user passed in a MySQL object already
		if (typeof(this.options.MySQL) == 'object')
		{
			// Test if this needs property coercion from the old format to the raw
			if (!this.options.MySQL.hasOwnProperty('connectionLimit') && this.options.MySQL.hasOwnProperty('ConnectionPoolLimit'))
			{
				this.options.MySQL.connectionLimit = this.options.MySQL.ConnectionPoolLimit;
			}
			if (!this.options.MySQL.hasOwnProperty('host') && this.options.MySQL.hasOwnProperty('Server'))
			{
				this.options.MySQL.host = this.options.MySQL.Server;
			}
			if (!this.options.MySQL.hasOwnProperty('port') && this.options.MySQL.hasOwnProperty('Port'))
			{
				this.options.MySQL.port = this.options.MySQL.Port;
			}
			if (!this.options.MySQL.hasOwnProperty('user') && this.options.MySQL.hasOwnProperty('User'))
			{
				this.options.MySQL.user = this.options.MySQL.User;
			}
			if (!this.options.MySQL.hasOwnProperty('password') && this.options.MySQL.hasOwnProperty('Password'))
			{
				this.options.MySQL.password = this.options.MySQL.Password;
			}
			if (!this.options.MySQL.hasOwnProperty('database') && this.options.MySQL.hasOwnProperty('Database'))
			{
				this.options.MySQL.database = this.options.MySQL.Database;
			}

			// Force the issue on this one.
			if (!this.options.MySQL.namedPlaceholders)
			{
				this.options.MySQL.namedPlaceholders = true;
			}
		}
		else if (typeof(this.fable.settings.MySQL) == 'object')
		{
			// TODO: Lint these settings for the user?  For now we will just presume they work and let errors do the dirty work.
			this.options.MySQL = (
				{
					connectionLimit: this.fable.settings.MySQL.ConnectionPoolLimit,
					host: this.fable.settings.MySQL.Server,
					port: this.fable.settings.MySQL.Port,
					user: this.fable.settings.MySQL.User,
					password: this.fable.settings.MySQL.Password,
					database: this.fable.settings.MySQL.Database,
					namedPlaceholders: true
				});
		}

		if (!this.options.MeadowConnectionMySQLAutoConnect)
		{
			// See if there is a global autoconnect
			this.options.MeadowConnectionMySQLAutoConnect = this.fable.settings.MeadowConnectionMySQLAutoConnect;
		}

		this.serviceType = 'MeadowConnectionMySQL';
		this._ConnectionPool = false;
		this.connected = false;

		if (this.options.MeadowConnectionMySQLAutoConnect)
		{
			this.connect();
		}
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
					// if (this.options.AllowIdentityInsert)
					// {
					// 	tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL PRIMARY KEY`;
					// }
					// else
					// {
					// There is debate on whether IDENTITY(1,1) is better or not.
					tmpCreateTableStatement += `        ${tmpColumn.Column} INT UNSIGNED NOT NULL AUTO_INCREMENT`;
					//}
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
					tmpPrimaryKey = tmpColumn.Column;
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
				default:
					break;
			}
		}
		if (tmpPrimaryKey)
		{
							tmpCreateTableStatement += `,\n\n        PRIMARY KEY (${tmpPrimaryKey})`;
		}
		tmpCreateTableStatement += `\n    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

		//this.log.info(`Generated Create Table Statement: ${tmpCreateTableStatement}`);

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
						// TODO: This check may be extraneous; not familiar enough with the mssql node driver yet
						&& (pError.originalError.hasOwnProperty('info'))
						// TODO: Validate that there isn't a better way to find this (pError.code isn't explicit enough)
						&& (pError.originalError.info.message.indexOf("There is already an object named") == 0)
						&& (pError.originalError.info.message.indexOf('in the database.') > 0))
					{
						// The table already existed; log a warning but keep on keeping on.
						this.log.warn(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} executed but table already existed.`);
						//this.log.warn(`Meadow-MySQL Create Table Statement: ${tmpCreateTableStatement}`)
						return fCallback();
					}
					else
					{
						this.log.error(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
						//this.log.warn(`Meadow-MySQL Create Table Statement: ${tmpCreateTableStatement}`)
						return fCallback(pError);
					}
				}
				else
				{
					this.log.info(`Meadow-MySQL CREATE TABLE ${pMeadowTableSchema.TableName} executed successfully.`);
					//this.log.info(`Meadow-MySQL Create Table Statement: ${tmpCreateTableStatement}`)
					return fCallback();
				}
			}.bind(this));
	}

	connect()
	{
		// TODO: Fable service for secrets management
		let tmpConnectionSettings = (
			{
				connectionLimit: this.options.connectionLimit,
				host: this.options.MySQL.host,
				port: this.options.MySQL.port,
				user: this.options.MySQL.user,
				password: this.options.MySQL.password,
				database: this.options.MySQL.database,
				namedPlaceholders: true
			});
		if (this._ConnectionPool)
		{
			tmpCleansedLogSettings = JSON.parse(JSON.stringify(tmpConnectionSettings));
			// No leaking passwords!
			tmpCleansedLogSettings.password = '*****************';
			this.log.error(`Meadow-Connection-MySQL trying to connect to MySQL but is already connected - skipping the generation of extra connections.`, tmpCleansedLogSettings);
		}
		else
		{
			this.fable.log.info(`Meadow-Connection-MySQL connecting to [${this.options.MySQL.host} : ${this.options.MySQL.port}] as ${this.options.MySQL.user} for database ${this.options.MySQL.database} at a connection limit of ${this.options.MySQL.connectionLimit}`);
			this._ConnectionPool = libMySQL.createPool(tmpConnectionSettings);
			this.connected = true;
		}
	}

	get pool()
	{
		return this._ConnectionPool;
	}
}

module.exports = MeadowConnectionMySQL;
