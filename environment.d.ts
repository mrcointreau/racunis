declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_HOST: string,
      DATABASE_NAME: string,
      DATABASE_USER: string
      DATABASE_PASSWORD: string,
      MYSQL_PORT: string,
      POSTGRESQL_PORT: string
    }
  }
}

export {}
