# Meadow MySQL Connection Pool Service

Simple fable service allowing access to the mysql2 connection pool in a consistent manner.  For use with meadow.

```
let _Fable = new libFable({
		"Product": "SomeCoolApp",

		"MySQL":
			{
				"Server": "127.0.0.1",
				"Port": 3306,
				"User": "USER",
				"Password": "PASSWORD",
				"Database": "DATABASE",
				"ConnectionPoolLimit": 20
			},

        MeadowConnectionMySQLAutoConnect: true
	});
_Fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider', require('meadow-connection-mysql));
```

Then you can access the pool.  If you don't set the `MeadowConnectionMySQLAutoconnect` flag, an extra call
will need to be run to `_Fable.MeadowMySQLProvider.connect()` when you want to connect.

This documentation does not yet get into how to instantiate multiple connections and manage them with fable,
although it can be done easily.