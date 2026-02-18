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
	}
);