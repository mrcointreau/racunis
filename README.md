<p align='center'>
  <img src='https://github.com/mrcointreau/racunis/raw/main/assets/logo.svg' alt='Racunis Logo' width='200' height='200'>
</p>

# Racunis

[![ci](https://github.com/mrcointreau/racunis/actions/workflows/ci.yaml/badge.svg)](https://github.com/mrcointreau/racunis/actions/workflows/ci.yaml)

Racunis is a comprehensive solution for queue management, offering robust and flexible job queueing systems designed to work with various databases. It provides core abstractions and specific implementations to facilitate easy management of background tasks in Node.js applications.

## Overview

Racunis is designed to simplify and enhance the process of managing job queues, ensuring reliable and efficient task execution. This repository contains multiple packages, each serving a distinct purpose within the overall system. By using Racunis, developers can focus on defining and processing their jobs without worrying about the underlying complexities of database operations.

## Packages

### @racunis/core

`@racunis/core` is the foundational package of the Racunis system. It provides abstract classes and error handling for creating and managing job queues, workers, and database pools. This package defines the core interfaces and base functionality that other packages extend and implement.

For more details, see the package [documentation](https://mrcointreau.github.io/racunis/modules/_racunis_core.html).

### @racunis/mysql

`@racunis/mysql` provides MySQL-specific implementations of the core abstractions defined in `@racunis/core`. It facilitates integration with MySQL databases, offering a straightforward way to manage background tasks in applications that use MySQL.

For more details, see the package [documentation](https://mrcointreau.github.io/racunis/modules/_racunis_mysql.html).

### @racunis/postgresql

`@racunis/postgresql` provides PostgreSQL-specific implementations of the core abstractions defined in `@racunis/core`. It allows for seamless integration with PostgreSQL databases, making it easy to manage background tasks in applications that use PostgreSQL.

For more details, see the package [documentation](https://mrcointreau.github.io/racunis/modules/_racunis_postgresql.html).

## Contributing

I appreciate your interest in contributing! Please see the [CONTRIBUTING.md](https://github.com/mrcointreau/racunis/blob/main/CONTRIBUTING.md) file for guidelines on how to contribute.

## License

Racunis is licensed under the MIT License. See the [LICENSE](https://github.com/mrcointreau/racunis/blob/main/LICENSE) file for more details.
