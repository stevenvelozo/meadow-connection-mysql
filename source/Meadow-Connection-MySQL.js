/**
* Meadow MySQL Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libMySQL = require('mysql2');

const libMeadowSchemaMySQL = require('./Meadow-Schema-MySQL.js');

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

		// Schema provider handles DDL operations (create, drop, index, etc.)
		this._SchemaProvider = new libMeadowSchemaMySQL(this.fable, this.options, `${this.Hash}-Schema`);

		if (this.options.MeadowConnectionMySQLAutoConnect)
		{
			this.connect();
		}
	}

	get schemaProvider()
	{
		return this._SchemaProvider;
	}

	generateDropTableStatement(pTableName)
	{
		return this._SchemaProvider.generateDropTableStatement(pTableName);
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateTableStatement(pMeadowTableSchema);
	}

	createTables(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createTables(pMeadowSchema, fCallback);
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createTable(pMeadowTableSchema, fCallback);
	}

	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		return this._SchemaProvider.getIndexDefinitionsFromSchema(pMeadowTableSchema);
	}

	generateCreateIndexScript(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexScript(pMeadowTableSchema);
	}

	generateCreateIndexStatements(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexStatements(pMeadowTableSchema);
	}

	createIndex(pIndexStatement, fCallback)
	{
		return this._SchemaProvider.createIndex(pIndexStatement, fCallback);
	}

	createIndices(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createIndices(pMeadowTableSchema, fCallback);
	}

	createAllIndices(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createAllIndices(pMeadowSchema, fCallback);
	}

	// Database Introspection delegation

	listTables(fCallback)
	{
		return this._SchemaProvider.listTables(fCallback);
	}

	introspectTableColumns(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableColumns(pTableName, fCallback);
	}

	introspectTableIndices(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableIndices(pTableName, fCallback);
	}

	introspectTableForeignKeys(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableForeignKeys(pTableName, fCallback);
	}

	introspectTableSchema(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableSchema(pTableName, fCallback);
	}

	introspectDatabaseSchema(fCallback)
	{
		return this._SchemaProvider.introspectDatabaseSchema(fCallback);
	}

	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		return this._SchemaProvider.generateMeadowPackageFromTable(pTableName, fCallback);
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
			this._SchemaProvider.setConnectionPool(this._ConnectionPool);
			this.connected = true;
		}
	}

	connectAsync(fCallback)
	{
		// Although MySQL connection is always sync (it manages the TCP layer
		// entirely) this is here to keep consistency for other drivers that
		// may need to do async work to connect sucn as MSSQL.
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow MySQL connectAsync() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}

		try
		{
			// Create the pool if it doesn't exist
			if (this._ConnectionPool)
			{
				return tmpCallback(null, this._ConnectionPool);
			}
			else
			{
				this.connect();
				return tmpCallback(null, this._ConnectionPool);
			}
		}
		catch(pError)
		{
			this.log.error(`Meadow MySQL connectAsync() trapped an error trying to connect to server: ${pError}`, pError);
			return tmpCallback(pError);
		}
	}

	get pool()
	{
		return this._ConnectionPool;
	}
}

module.exports = MeadowConnectionMySQL;
