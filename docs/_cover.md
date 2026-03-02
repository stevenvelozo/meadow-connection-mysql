# Meadow Connection MySQL

<small>v1.0.8</small>

> MySQL connection pooling as a Fable service

A lightweight wrapper around [mysql2](https://github.com/sidorares/node-mysql2) that manages connection pooling, supports auto-connect, and integrates with Meadow for provider-based data access. Register once, query from anywhere.

- **Connection Pooling** -- Managed mysql2 pool with configurable connection limits
- **Auto-Connect** -- Set one flag and the pool is ready at service instantiation
- **Schema-Driven DDL** -- Generate and execute CREATE TABLE statements from Meadow schema definitions
- **Named Placeholders** -- Automatic named placeholder support for parameterized queries
- **Flexible Config** -- Accepts both Meadow-style and mysql2-native configuration formats
- **Connection Safety** -- Guards against duplicate pools with cleansed logging

[Get Started](README.md)
[Quickstart](quickstart.md)
[Architecture](architecture.md)
[Schema & Tables](schema.md)
[API Reference](api/reference.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-mysql)
