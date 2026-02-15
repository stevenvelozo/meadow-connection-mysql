# Meadow Connection MySQL

> MySQL connection pooling as a Fable service

A lightweight wrapper around mysql2 that manages connection pooling, supports auto-connect, and integrates with Meadow for provider-based data access. Register once, query from anywhere.

- **Connection Pooling** -- Managed mysql2 pool with configurable connection limits
- **Auto-Connect** -- Set one flag and the pool is ready at service instantiation
- **Schema Support** -- Generate CREATE TABLE statements from Meadow schema definitions
- **Flexible Config** -- Read settings from Fable, pass them per-instance, or mix both

[Get Started](README.md)
[Schema & Tables](schema.md)
[API Reference](api.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-mysql)
