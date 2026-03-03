/**
* Unit tests for the Linked List ADT
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require('chai');
const Expect = Chai.expect;
const Assert = Chai.assert;

const libFable = require('fable');
const libMeadowConnectionMySQL = require('../source/Meadow-Connection-MySQL.js');
const libMeadowSchemaMySQL = require('../source/Meadow-Schema-MySQL.js');

const _FableConfig = (
	{
		"Product": "MeadowMySQLTestBookstore",
		"ProductVersion": "1.0.0",
	
		"UUID":
			{
				"DataCenter": 0,
				"Worker": 0
			},
		"LogStreams":
			[
				{
					"streamtype": "console"
				}
			],
	
		"MySQL":
			{
				"Server": "127.0.0.1",
				"Port": 23306,
				"User": "root",
				"Password": "1234567890",
				"Database": "bookstore",
				"ConnectionPoolLimit": 20
			}
	})

const _BookTableSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255' },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
};

const _BookTableSchemaWithColumnIndexed =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255', Indexed: true },
		{ Column: 'Email', DataType: 'String', Size: '512', Indexed: 'unique' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
};

const _BookTableSchemaWithIndexName =
{
	TableName: 'BookCustomIdx',
	Columns:
	[
		{ Column: 'IDBookCustomIdx', DataType: 'ID' },
		{ Column: 'GUIDBookCustomIdx', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255', Indexed: true, IndexName: 'IX_Custom_Title' },
		{ Column: 'Email', DataType: 'String', Size: '512', Indexed: 'unique', IndexName: 'UQ_BookCustomIdx_Email' },
		{ Column: 'Rating', DataType: 'Numeric', Indexed: true },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
};

// Schemas specifically for introspection testing (unique table names to avoid conflicts)
const _IntrospectBookSchema =
{
	TableName: 'IntrospBook',
	Columns:
	[
		{ Column: 'IDIntrospBook', DataType: 'ID' },
		{ Column: 'GUIDIntrospBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255' },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'PageCount', DataType: 'Numeric' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	]
};

const _IntrospectBookIndexedSchema =
{
	TableName: 'IntrospBookIdx',
	Columns:
	[
		{ Column: 'IDIntrospBookIdx', DataType: 'ID' },
		{ Column: 'GUIDIntrospBookIdx', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255', Indexed: true },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'ISBN', DataType: 'String', Size: '64', Indexed: 'unique' },
		{ Column: 'IDPublisher', DataType: 'ForeignKey' }
	]
};

const _IntrospectBookCustomIdxSchema =
{
	TableName: 'IntrospBookCustIdx',
	Columns:
	[
		{ Column: 'IDIntrospBookCustIdx', DataType: 'ID' },
		{ Column: 'GUIDIntrospBookCustIdx', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '255', Indexed: true, IndexName: 'IX_Custom_Title' },
		{ Column: 'ISBN', DataType: 'String', Size: '64', Indexed: 'unique', IndexName: 'UQ_IntrospBookCustIdx_ISBN' },
		{ Column: 'YearPublished', DataType: 'Numeric', Indexed: true },
		{ Column: 'IDEditor', DataType: 'ForeignKey' }
	]
};

suite
(
	'Connection',
	()=>
	{
		setup(()=>{});

		suite
		(
			'Connect to MySQL',
			()=>
			{
				test
				(
					'use default settings from fable.settings',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

						_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider');

						Expect(_Fable.MeadowMySQLProvider).to.be.an('object');

						_Fable.MeadowMySQLProvider.connect();

						// We should now have a fully charged MySQL connection pool utensil
						_Fable.MeadowMySQLProvider.pool.query(`SELECT * FROM Book ORDER BY IDBook ASC LIMIT 10`,
							(pError, pRows, pFields) =>
							{
								Expect(pRows).to.be.an('array');
								Expect(pRows.length).to.equal(10);
								Expect(pRows[0].Title).to.equal(`The Hunger Games`);
								return fDone();
							});
					}
				);
				test
				(
					'pass in your own settings',
					(fDone) =>
					{
						let _Fable = new libFable();
						_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

						_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider', {MySQL: _FableConfig.MySQL});

						Expect(_Fable.MeadowMySQLProvider).to.be.an('object');

						_Fable.MeadowMySQLProvider.connect();

						// We should now have a fully charged MySQL connection pool utensil
						_Fable.MeadowMySQLProvider.pool.query(`SELECT * FROM Book ORDER BY IDBook ASC LIMIT 10`,
							(pError, pRows, pFields) =>
							{
								Expect(pRows).to.be.an('array');
								Expect(pRows.length).to.equal(10);
								Expect(pRows[1].Title).to.equal(`Harry Potter and the Philosopher's Stone`);
								return fDone();
							});
					}
				);
				test
				(
					'connect asynchronously',
					(fDone) =>
					{
						let _Fable = new libFable();
						_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

						_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider', {MySQL: _FableConfig.MySQL});

						Expect(_Fable.MeadowMySQLProvider).to.be.an('object');

						_Fable.MeadowMySQLProvider.connectAsync(
							function (pError, pConnectionPool)
							{
							// We should now have a fully charged MySQL connection pool utensil
							_Fable.MeadowMySQLProvider.pool.query(`SELECT * FROM Book ORDER BY IDBook ASC LIMIT 10`,
								(pError, pRows, pFields) =>
								{
									Expect(pRows).to.be.an('array');
									Expect(pRows.length).to.equal(10);
									Expect(pRows[1].Title).to.equal(`Harry Potter and the Philosopher's Stone`);
									return fDone();
								});
							}
						);
					}
				);
				test
				(
					'test autoconnect, one-liner instantiation',
					(fDone) =>
					{
						let tmpFableConfig = JSON.parse(JSON.stringify(_FableConfig));
						// Setting this to true will connect on instantiation
						tmpFableConfig.MeadowConnectionMySQLAutoConnect = true;

						let _Fable = new libFable(tmpFableConfig);
						_Fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

						Expect(_Fable.MeadowMySQLProvider).to.be.an('object');

						// We should now have a fully charged MySQL connection pool utensil
						_Fable.MeadowMySQLProvider.pool.query(`SELECT * FROM Book ORDER BY IDBook ASC LIMIT 10`,
							(pError, pRows, pFields) =>
							{
								Expect(pRows).to.be.an('array');
								Expect(pRows.length).to.equal(10);
								Expect(pRows[1].Title).to.equal(`Harry Potter and the Philosopher's Stone`);
								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Index Generation',
			()=>
			{
				let libSchemaMySQL = null;

				setup(
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						libSchemaMySQL = _Fable.serviceManager.addServiceType('MeadowSchemaMySQL', libMeadowSchemaMySQL);
						libSchemaMySQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaMySQL');
					});

				test
				(
					'auto-detect GUID and ForeignKey indices',
					() =>
					{
						let tmpIndices = libSchemaMySQL.getIndexDefinitionsFromSchema(_BookTableSchema);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(2);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBook');
						Expect(tmpIndices[0].Unique).to.equal(true);
						Expect(tmpIndices[1].Name).to.equal('IX_M_IDAuthor');
						Expect(tmpIndices[1].Unique).to.equal(false);
					}
				);

				test
				(
					'generate idempotent index script',
					() =>
					{
						let tmpScript = libSchemaMySQL.generateCreateIndexScript(_BookTableSchema);
						Expect(tmpScript).to.contain('AK_M_GUIDBook');
						Expect(tmpScript).to.contain('IX_M_IDAuthor');
					}
				);

				test
				(
					'generate individual index statements',
					() =>
					{
						let tmpStatements = libSchemaMySQL.generateCreateIndexStatements(_BookTableSchema);
						Expect(tmpStatements).to.be.an('array');
						Expect(tmpStatements.length).to.equal(2);
						Expect(tmpStatements[0].Name).to.equal('AK_M_GUIDBook');
						Expect(tmpStatements[0].Statement).to.contain('CREATE UNIQUE INDEX');
						Expect(tmpStatements[0].CheckStatement).to.contain('INFORMATION_SCHEMA');
					}
				);

				test
				(
					'column-level Indexed property generates consistently named indices',
					() =>
					{
						let tmpIndices = libSchemaMySQL.getIndexDefinitionsFromSchema(_BookTableSchemaWithColumnIndexed);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(4);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBook');
						Expect(tmpIndices[1].Name).to.equal('IX_M_T_Book_C_Title');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('AK_M_T_Book_C_Email');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_IDAuthor');
					}
				);

				test
				(
					'generate script with column-level Indexed property',
					() =>
					{
						let tmpScript = libSchemaMySQL.generateCreateIndexScript(_BookTableSchemaWithColumnIndexed);
						Expect(tmpScript).to.contain('IX_M_T_Book_C_Title');
						Expect(tmpScript).to.contain('AK_M_T_Book_C_Email');
					}
				);

				test
				(
					'IndexName property overrides auto-generated index name',
					() =>
					{
						let tmpIndices = libSchemaMySQL.getIndexDefinitionsFromSchema(_BookTableSchemaWithIndexName);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(5);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBookCustomIdx');
						Expect(tmpIndices[1].Name).to.equal('IX_Custom_Title');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('UQ_BookCustomIdx_Email');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_T_BookCustomIdx_C_Rating');
						Expect(tmpIndices[3].Unique).to.equal(false);
						Expect(tmpIndices[4].Name).to.equal('IX_M_IDAuthor');
					}
				);

				test
				(
					'generate script with IndexName uses custom names in SQL',
					() =>
					{
						let tmpScript = libSchemaMySQL.generateCreateIndexScript(_BookTableSchemaWithIndexName);
						Expect(tmpScript).to.contain('IX_Custom_Title');
						Expect(tmpScript).to.contain('UQ_BookCustomIdx_Email');
						Expect(tmpScript).to.contain('IX_M_T_BookCustomIdx_C_Rating');
						Expect(tmpScript).to.not.contain('IX_M_T_BookCustomIdx_C_Title');
						Expect(tmpScript).to.not.contain('AK_M_T_BookCustomIdx_C_Email');
					}
				);

				test
				(
					'schema provider is accessible from connection provider',
					() =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);
						_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider');
						Expect(_Fable.MeadowMySQLProvider.schemaProvider).to.be.an('object');
					}
				);
			}
		);

	suite
	(
		'Database Introspection',
		()=>
		{
			let _Fable = null;
			let libSchemaMySQL = null;

			setup(
				(fDone) =>
				{
					_Fable = new libFable(_FableConfig);
					_Fable.serviceManager.addServiceType('MeadowSchemaMySQL', libMeadowSchemaMySQL);
					libSchemaMySQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaMySQL');
					_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);
					_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider');

					_Fable.MeadowMySQLProvider.connectAsync(
						(pError) =>
						{
							if (pError) return fDone(pError);
							libSchemaMySQL.setConnectionPool(_Fable.MeadowMySQLProvider.pool);

							// Drop test tables first (clean slate)
							_Fable.MeadowMySQLProvider.pool.query('DROP TABLE IF EXISTS IntrospBook, IntrospBookIdx, IntrospBookCustIdx',
								(pDropError) =>
								{
									if (pDropError) return fDone(pDropError);

									let tmpSchema = { Tables: [_IntrospectBookSchema, _IntrospectBookIndexedSchema, _IntrospectBookCustomIdxSchema] };
									libSchemaMySQL.createTables(tmpSchema,
										(pCreateError) =>
										{
											if (pCreateError) return fDone(pCreateError);
											libSchemaMySQL.createAllIndices(tmpSchema,
												(pIdxError) =>
												{
													return fDone(pIdxError);
												});
										});
								});
						});
				});

			test
			(
				'listTables returns tables including introspection test tables',
				(fDone) =>
				{
					libSchemaMySQL.listTables(
						(pError, pTables) =>
						{
							Expect(pError).to.not.exist;
							Expect(pTables).to.be.an('array');
							Expect(pTables).to.include('IntrospBook');
							Expect(pTables).to.include('IntrospBookIdx');
							Expect(pTables).to.include('IntrospBookCustIdx');
							return fDone();
						});
				}
			);

			test
			(
				'introspectTableColumns returns column definitions for IntrospBook',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableColumns('IntrospBook',
						(pError, pColumns) =>
						{
							Expect(pError).to.not.exist;
							Expect(pColumns).to.be.an('array');
							Expect(pColumns.length).to.equal(9);

							// ID column (AUTO_INCREMENT)
							Expect(pColumns[0].Column).to.equal('IDIntrospBook');
							Expect(pColumns[0].DataType).to.equal('ID');

							// GUID column (CHAR with GUID in name)
							Expect(pColumns[1].Column).to.equal('GUIDIntrospBook');
							Expect(pColumns[1].DataType).to.equal('GUID');

							// String column (CHAR)
							Expect(pColumns[2].Column).to.equal('Title');
							Expect(pColumns[2].DataType).to.equal('String');

							// Text column
							Expect(pColumns[3].Column).to.equal('Description');
							Expect(pColumns[3].DataType).to.equal('Text');

							// Decimal column
							Expect(pColumns[4].Column).to.equal('Price');
							Expect(pColumns[4].DataType).to.equal('Decimal');

							// Numeric column (INT)
							Expect(pColumns[5].Column).to.equal('PageCount');
							Expect(pColumns[5].DataType).to.equal('Numeric');

							// DateTime column
							Expect(pColumns[6].Column).to.equal('PublishDate');
							Expect(pColumns[6].DataType).to.equal('DateTime');

							// Boolean column (TINYINT with In prefix hint)
							Expect(pColumns[7].Column).to.equal('InPrint');
							Expect(pColumns[7].DataType).to.equal('Boolean');

							// ForeignKey column (no actual FK constraint, detected as Numeric)
							Expect(pColumns[8].Column).to.equal('IDAuthor');
							Expect(pColumns[8].DataType).to.equal('Numeric');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableIndices returns index definitions for IntrospBook',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableIndices('IntrospBook',
						(pError, pIndices) =>
						{
							Expect(pError).to.not.exist;
							Expect(pIndices).to.be.an('array');
							Expect(pIndices.length).to.equal(2);

							let tmpNames = pIndices.map((pIdx) => { return pIdx.Name; });
							Expect(tmpNames).to.include('AK_M_GUIDIntrospBook');
							Expect(tmpNames).to.include('IX_M_IDAuthor');

							let tmpGUIDIndex = pIndices.find((pIdx) => { return pIdx.Name === 'AK_M_GUIDIntrospBook'; });
							Expect(tmpGUIDIndex.Unique).to.equal(true);
							Expect(tmpGUIDIndex.Columns).to.deep.equal(['GUIDIntrospBook']);

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableForeignKeys returns empty for table without FK constraints',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableForeignKeys('IntrospBook',
						(pError, pFKs) =>
						{
							Expect(pError).to.not.exist;
							Expect(pFKs).to.be.an('array');
							Expect(pFKs.length).to.equal(0);
							return fDone();
						});
				}
			);

			test
			(
				'introspectTableSchema combines columns and indices for IntrospBookIdx',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableSchema('IntrospBookIdx',
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;
							Expect(pSchema).to.be.an('object');
							Expect(pSchema.TableName).to.equal('IntrospBookIdx');
							Expect(pSchema.Columns).to.be.an('array');

							// Check that column-level Indexed properties are folded in
							let tmpTitleCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Title'; });
							Expect(tmpTitleCol.Indexed).to.equal(true);
							Expect(tmpTitleCol).to.not.have.property('IndexName');

							let tmpISBNCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'ISBN'; });
							Expect(tmpISBNCol.Indexed).to.equal('unique');
							Expect(tmpISBNCol).to.not.have.property('IndexName');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableSchema preserves IndexName for custom-named indices',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableSchema('IntrospBookCustIdx',
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;
							Expect(pSchema.TableName).to.equal('IntrospBookCustIdx');

							// Title has custom IndexName IX_Custom_Title
							let tmpTitleCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Title'; });
							Expect(tmpTitleCol.Indexed).to.equal(true);
							Expect(tmpTitleCol.IndexName).to.equal('IX_Custom_Title');

							// ISBN has custom IndexName UQ_IntrospBookCustIdx_ISBN
							let tmpISBNCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'ISBN'; });
							Expect(tmpISBNCol.Indexed).to.equal('unique');
							Expect(tmpISBNCol.IndexName).to.equal('UQ_IntrospBookCustIdx_ISBN');

							// YearPublished has auto-generated name - no IndexName
							let tmpYearCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'YearPublished'; });
							Expect(tmpYearCol.Indexed).to.equal(true);
							Expect(tmpYearCol).to.not.have.property('IndexName');

							return fDone();
						});
				}
			);

			test
			(
				'introspectDatabaseSchema returns schemas for all tables',
				(fDone) =>
				{
					libSchemaMySQL.introspectDatabaseSchema(
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;
							Expect(pSchema).to.be.an('object');
							Expect(pSchema.Tables).to.be.an('array');
							Expect(pSchema.Tables.length).to.be.greaterThan(0);

							let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
							Expect(tmpTableNames).to.include('IntrospBook');
							Expect(tmpTableNames).to.include('IntrospBookIdx');
							Expect(tmpTableNames).to.include('IntrospBookCustIdx');

							return fDone();
						});
				}
			);

			test
			(
				'generateMeadowPackageFromTable produces Meadow package JSON',
				(fDone) =>
				{
					libSchemaMySQL.generateMeadowPackageFromTable('IntrospBook',
						(pError, pPackage) =>
						{
							Expect(pError).to.not.exist;
							Expect(pPackage).to.be.an('object');
							Expect(pPackage.Scope).to.equal('IntrospBook');
							Expect(pPackage.DefaultIdentifier).to.equal('IDIntrospBook');
							Expect(pPackage.Schema).to.be.an('array');
							Expect(pPackage.DefaultObject).to.be.an('object');

							// Verify schema entries
							let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'IDIntrospBook'; });
							Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

							let tmpGUIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'GUIDIntrospBook'; });
							Expect(tmpGUIDEntry.Type).to.equal('AutoGUID');

							let tmpTitleEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'Title'; });
							Expect(tmpTitleEntry.Type).to.equal('String');

							// Verify default object
							Expect(pPackage.DefaultObject.IDIntrospBook).to.equal(0);
							Expect(pPackage.DefaultObject.GUIDIntrospBook).to.equal('');
							Expect(pPackage.DefaultObject.Title).to.equal('');

							return fDone();
						});
				}
			);

			test
			(
				'round-trip: introspect IntrospBookIdx and regenerate matching indices',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableSchema('IntrospBookIdx',
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;

							// Use the introspected schema to generate index definitions
							let tmpIndices = libSchemaMySQL.getIndexDefinitionsFromSchema(pSchema);

							// The original IntrospBookIdx had:
							//   AK_M_GUIDIntrospBookIdx (GUID auto)
							//   IX_M_T_IntrospBookIdx_C_Title (Indexed: true)
							//   AK_M_T_IntrospBookIdx_C_ISBN (Indexed: 'unique')
							//   IX_M_IDPublisher (FK auto)
							let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
							Expect(tmpNames).to.include('AK_M_GUIDIntrospBookIdx');
							Expect(tmpNames).to.include('IX_M_T_IntrospBookIdx_C_Title');
							Expect(tmpNames).to.include('AK_M_T_IntrospBookIdx_C_ISBN');
							Expect(tmpNames).to.include('IX_M_IDPublisher');

							return fDone();
						});
				}
			);

			test
			(
				'round-trip: introspect IntrospBookCustIdx and regenerate matching index names',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableSchema('IntrospBookCustIdx',
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;

							// Use the introspected schema to generate index definitions
							let tmpIndices = libSchemaMySQL.getIndexDefinitionsFromSchema(pSchema);

							// The original IntrospBookCustIdx had:
							//   AK_M_GUIDIntrospBookCustIdx (GUID auto)
							//   IX_Custom_Title (IndexName override)
							//   UQ_IntrospBookCustIdx_ISBN (IndexName override, unique)
							//   IX_M_T_IntrospBookCustIdx_C_YearPublished (auto)
							//   IX_M_IDEditor (FK auto)
							let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
							Expect(tmpNames).to.include('AK_M_GUIDIntrospBookCustIdx');
							Expect(tmpNames).to.include('IX_Custom_Title');
							Expect(tmpNames).to.include('UQ_IntrospBookCustIdx_ISBN');
							Expect(tmpNames).to.include('IX_M_T_IntrospBookCustIdx_C_YearPublished');
							Expect(tmpNames).to.include('IX_M_IDEditor');

							return fDone();
						});
				}
			);
		}
	);

	suite
	(
		'Chinook Database Introspection',
		()=>
		{
			let _Fable = null;
			let libSchemaMySQL = null;

			setup(
				(fDone) =>
				{
					_Fable = new libFable(_FableConfig);
					_Fable.serviceManager.addServiceType('MeadowSchemaMySQL', libMeadowSchemaMySQL);
					libSchemaMySQL = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaMySQL');
					_Fable.serviceManager.addServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);
					_Fable.serviceManager.instantiateServiceProvider('MeadowMySQLProvider');
					_Fable.MeadowMySQLProvider.connectAsync(
						(pError) =>
						{
							if (pError) return fDone(pError);
							libSchemaMySQL.setConnectionPool(_Fable.MeadowMySQLProvider.pool);
							return fDone();
						});
				});

			test
			(
				'listTables includes all 11 Chinook tables',
				(fDone) =>
				{
					libSchemaMySQL.listTables(
						(pError, pTables) =>
						{
							Expect(pError).to.not.exist;
							Expect(pTables).to.be.an('array');

							let tmpChinookTables = ['Album', 'Artist', 'Customer', 'Employee',
								'Genre', 'Invoice', 'InvoiceLine', 'MediaType',
								'Playlist', 'PlaylistTrack', 'Track'];

							tmpChinookTables.forEach(
								(pTableName) =>
								{
									Expect(pTables).to.include(pTableName);
								});

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableColumns on Track detects all 9 columns with correct types',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableColumns('Track',
						(pError, pColumns) =>
						{
							Expect(pError).to.not.exist;
							Expect(pColumns).to.be.an('array');
							Expect(pColumns.length).to.equal(9);

							let tmpTrackId = pColumns.find((pCol) => { return pCol.Column === 'TrackId'; });
							Expect(tmpTrackId.DataType).to.equal('ID');

							let tmpName = pColumns.find((pCol) => { return pCol.Column === 'Name'; });
							Expect(tmpName.DataType).to.equal('String');

							let tmpUnitPrice = pColumns.find((pCol) => { return pCol.Column === 'UnitPrice'; });
							Expect(tmpUnitPrice.DataType).to.equal('Decimal');

							let tmpMilliseconds = pColumns.find((pCol) => { return pCol.Column === 'Milliseconds'; });
							Expect(tmpMilliseconds.DataType).to.equal('Numeric');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableColumns on Employee detects 15 columns',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableColumns('Employee',
						(pError, pColumns) =>
						{
							Expect(pError).to.not.exist;
							Expect(pColumns.length).to.equal(15);

							let tmpEmployeeId = pColumns.find((pCol) => { return pCol.Column === 'EmployeeId'; });
							Expect(tmpEmployeeId.DataType).to.equal('ID');

							let tmpBirthDate = pColumns.find((pCol) => { return pCol.Column === 'BirthDate'; });
							Expect(tmpBirthDate.DataType).to.equal('DateTime');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableForeignKeys on Track detects 3 FK relationships',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableForeignKeys('Track',
						(pError, pFKs) =>
						{
							Expect(pError).to.not.exist;
							Expect(pFKs).to.be.an('array');
							Expect(pFKs.length).to.equal(3);

							let tmpAlbumFK = pFKs.find((pFK) => { return pFK.Column === 'AlbumId'; });
							Expect(tmpAlbumFK).to.exist;
							Expect(tmpAlbumFK.ReferencedTable).to.equal('Album');
							Expect(tmpAlbumFK.ReferencedColumn).to.equal('AlbumId');

							let tmpMediaTypeFK = pFKs.find((pFK) => { return pFK.Column === 'MediaTypeId'; });
							Expect(tmpMediaTypeFK).to.exist;
							Expect(tmpMediaTypeFK.ReferencedTable).to.equal('MediaType');

							let tmpGenreFK = pFKs.find((pFK) => { return pFK.Column === 'GenreId'; });
							Expect(tmpGenreFK).to.exist;
							Expect(tmpGenreFK.ReferencedTable).to.equal('Genre');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableForeignKeys on Employee detects self-referential FK',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableForeignKeys('Employee',
						(pError, pFKs) =>
						{
							Expect(pError).to.not.exist;
							Expect(pFKs).to.be.an('array');
							Expect(pFKs.length).to.equal(1);

							Expect(pFKs[0].Column).to.equal('ReportsTo');
							Expect(pFKs[0].ReferencedTable).to.equal('Employee');
							Expect(pFKs[0].ReferencedColumn).to.equal('EmployeeId');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableForeignKeys on PlaylistTrack detects 2 FKs',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableForeignKeys('PlaylistTrack',
						(pError, pFKs) =>
						{
							Expect(pError).to.not.exist;
							Expect(pFKs).to.be.an('array');
							Expect(pFKs.length).to.equal(2);

							let tmpPlaylistFK = pFKs.find((pFK) => { return pFK.Column === 'PlaylistId'; });
							Expect(tmpPlaylistFK).to.exist;
							Expect(tmpPlaylistFK.ReferencedTable).to.equal('Playlist');

							let tmpTrackFK = pFKs.find((pFK) => { return pFK.Column === 'TrackId'; });
							Expect(tmpTrackFK).to.exist;
							Expect(tmpTrackFK.ReferencedTable).to.equal('Track');

							return fDone();
						});
				}
			);

			test
			(
				'introspectTableSchema on Track combines columns with FK detection',
				(fDone) =>
				{
					libSchemaMySQL.introspectTableSchema('Track',
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;
							Expect(pSchema.TableName).to.equal('Track');
							Expect(pSchema.ForeignKeys.length).to.equal(3);

							// FK columns should be detected
							let tmpAlbumIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'AlbumId'; });
							Expect(tmpAlbumIdCol.DataType).to.equal('ForeignKey');

							let tmpMediaTypeIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'MediaTypeId'; });
							Expect(tmpMediaTypeIdCol.DataType).to.equal('ForeignKey');

							let tmpGenreIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'GenreId'; });
							Expect(tmpGenreIdCol.DataType).to.equal('ForeignKey');

							return fDone();
						});
				}
			);

			test
			(
				'introspectDatabaseSchema includes all Chinook tables',
				(fDone) =>
				{
					libSchemaMySQL.introspectDatabaseSchema(
						(pError, pSchema) =>
						{
							Expect(pError).to.not.exist;
							Expect(pSchema.Tables).to.be.an('array');

							let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
							Expect(tmpTableNames).to.include('Track');
							Expect(tmpTableNames).to.include('Album');
							Expect(tmpTableNames).to.include('Artist');
							Expect(tmpTableNames).to.include('Employee');
							Expect(tmpTableNames).to.include('Customer');
							Expect(tmpTableNames).to.include('Invoice');
							Expect(tmpTableNames).to.include('InvoiceLine');
							Expect(tmpTableNames).to.include('PlaylistTrack');

							let tmpTrack = pSchema.Tables.find((pT) => { return pT.TableName === 'Track'; });
							Expect(tmpTrack.ForeignKeys.length).to.equal(3);

							return fDone();
						});
				}
			);

			test
			(
				'generateMeadowPackageFromTable on Album produces valid package',
				(fDone) =>
				{
					libSchemaMySQL.generateMeadowPackageFromTable('Album',
						(pError, pPackage) =>
						{
							Expect(pError).to.not.exist;
							Expect(pPackage.Scope).to.equal('Album');
							Expect(pPackage.DefaultIdentifier).to.equal('AlbumId');
							Expect(pPackage.Schema).to.be.an('array');
							Expect(pPackage.DefaultObject).to.be.an('object');

							let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'AlbumId'; });
							Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

							let tmpTitleEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'Title'; });
							Expect(tmpTitleEntry.Type).to.equal('String');

							return fDone();
						});
				}
			);

			test
			(
				'generateMeadowPackageFromTable on Track handles FKs and Decimal',
				(fDone) =>
				{
					libSchemaMySQL.generateMeadowPackageFromTable('Track',
						(pError, pPackage) =>
						{
							Expect(pError).to.not.exist;
							Expect(pPackage.Scope).to.equal('Track');
							Expect(pPackage.DefaultIdentifier).to.equal('TrackId');

							let tmpUnitPriceEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'UnitPrice'; });
							Expect(tmpUnitPriceEntry).to.exist;

							return fDone();
						});
				}
			);
		}
	);
	}
);