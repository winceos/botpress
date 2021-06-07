---
id: database
title: Supported databases
---

## Introduction

By default, Botpress uses SQLite as its database. However, we recommend that you switch to PostgreSQL as early as you can in your chatbot development cycle because it is highly fault tolerant, stable, scalable and secure.

## How to switch from SQLite to PostgresSQL

First, make sure you're running PostgreSQL 9.5+ and create your database before starting Botpress.

Once your database is created the only thing Botpress needs is a [standard PG connection string](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING) configured in the `DATABASE_URL` environment variables.

- `DATABASE_URL=postgres://login:password@your-db-host.com:5432/your-db-name`.

If you want to use the default PostgresSQL connection string, set it as follows:

- `DATABASE_URL=postgres`.

While using PostgresSQL, you can configure the Connection Pools by using the `DATABASE_POOL` environment variable. For detailed options please refer to [tarn.js](https://github.com/vincit/tarn.js) for all configuration options. You must enter valid json. Example:

`DATABASE_POOL={"min": 3, "max": 10}`

You can also set the PostgreSQL Schema Search Path for every database connection (official pg doc [here](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)) by setting the `DATABASE_PG_SEARCH_PATH` environment variable.

- `DATABASE_PG_SEARCH_PATH=mySchema`

This will be the equivalent of using the following SQL statement `SET search_path to mySchema`. This feature requires you to create the schema prior to setting it. Moreover, although it's not recommended, you can set multiple schemas in your search path using a comma separated value syntax as you would do using the SQL statement. Use multiple schemas only if you know what you're doing.

If you don't want to type these variables each time you start Botpress, we also support `.env` files. Check out our [configuration section](../advanced/configuration) for more information.

## Accessing databases

Two handy ways to access whichever database you choose to use are:

1. The [key-value store](https://botpress.com/reference/modules/_botpress_sdk_.kvs.html)
2. A [knex instance](http://knexjs.org/)

> **Pro Tip** We encourage you to use either kebab case or snake case when defining tables and columns. However, if you prefer camel case don't forget to wrap table and column names in "quotes".
