import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AllForOne API',
      version: '0.1.0'
    }
  },
  apis: []
}

export const swaggerSpec = swaggerJSDoc(options)
export { swaggerUi }

