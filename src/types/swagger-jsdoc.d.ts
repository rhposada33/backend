declare module 'swagger-jsdoc' {
  interface SwaggerDefinition {
    openapi: string;
    info: {
      title: string;
      version: string;
      description?: string;
      contact?: {
        name?: string;
        url?: string;
        email?: string;
      };
      license?: {
        name: string;
        url?: string;
      };
    };
    servers?: Array<{
      url: string;
      description?: string;
    }>;
    components?: {
      [key: string]: any;
    };
    tags?: Array<{
      name: string;
      description?: string;
    }>;
  }

  interface SwaggerOptions {
    definition: SwaggerDefinition;
    apis: string[];
  }

  function swaggerJsdoc(options: SwaggerOptions): Record<string, any>;

  export default swaggerJsdoc;
}
