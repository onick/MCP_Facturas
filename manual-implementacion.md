# Manual de Implementación - Asistente para Concesionario de Vehículos

Este manual detalla cómo implementar un asistente virtual inteligente para un concesionario de vehículos que puede responder consultas de clientes a través de WhatsApp, mostrar información de vehículos y generar facturas proforma en PDF.

## Componentes del Sistema

El sistema completo consta de tres componentes principales:

1. **Servidor MCP (Model Context Protocol)**: Proporciona herramientas para buscar vehículos, obtener detalles y generar facturas.
2. **Claude (Anthropic)**: Modelo de IA que actúa como interfaz inteligente con el cliente.
3. **n8n**: Plataforma de automatización que conecta WhatsApp con Claude y gestiona el flujo de trabajo.

## 1. Configuración del Servidor MCP

### Requisitos previos
- Node.js v16 o superior
- npm o yarn

### Pasos de instalación

1. Crea una carpeta para el proyecto:
   ```bash
   mkdir dealership-mcp-server
   cd dealership-mcp-server
   ```

2. Crea la estructura de archivos:
   ```bash
   mkdir -p src invoices temp
   ```

3. Copia los archivos `package.json` y `tsconfig.json` compartidos anteriormente en la carpeta raíz.

4. Copia el archivo `index.ts` en la carpeta `src`.

5. Instala las dependencias:
   ```bash
   npm install
   ```

6. Compila el proyecto:
   ```bash
   npm run build
   ```

7. Prueba el servidor:
   ```bash
   npm start
   ```

8. El servidor debería estar funcionando. No deberías ver nada en la consola porque la comunicación se realiza a través de stdio.

### Personalización de la Base de Datos de Vehículos

Para usar tus propios datos de vehículos en lugar de los datos de ejemplo:

1. Modifica el array `vehicleDatabase` en `src/index.ts` para incluir tu inventario real.
2. Si tienes una base de datos real, puedes modificar las funciones para consultar tu base de datos en lugar de usar el array estático.

## 2. Configuración de Claude para Desktop

Para usar Claude como agente inteligente:

1. Descarga e instala [Claude para Desktop](https://claude.ai/download) (disponible para Windows y macOS).

2. Crea o edita el archivo de configuración de Claude:
   - En macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - En Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. Añade la configuración del servidor MCP (reemplaza la ruta con la ubicación real de tu servidor):
   ```json
   {
     "mcpServers": {
       "dealership": {
         "command": "node",
         "args": [
           "/ruta/absoluta/a/dealership-mcp-server/build/index.js"
         ]
       }
     }
   }
   ```

4. Reinicia Claude para Desktop para que detecte el nuevo servidor MCP.

5. Verifica que Claude detecte las herramientas: deberías ver un icono de martillo en la interfaz cuando envíes un mensaje.

## 3. Configuración de n8n para WhatsApp

### Requisitos previos
- Una instancia de n8n (puede ser local o en la nube)
- Una cuenta de WhatsApp Business API o un proveedor de WhatsApp (como Twilio, 360dialog, etc.)
- Una clave API de Anthropic para Claude

### Pasos de instalación

1. Instala n8n siguiendo las [instrucciones oficiales](https://docs.n8n.io/getting-started/installation/).

2. Inicia sesión en n8n y crea un nuevo flujo de trabajo.

3. Importa el flujo de trabajo JSON proporcionado o recréalo manualmente siguiendo el esquema.

4. Configura las credenciales:
   - Configura WhatsApp Business API
   - Añade tu clave API de Anthropic en el nodo "Credentials"

5. Configura el webhook:
   - Activa el nodo webhook
   - Copia la URL generada (la necesitarás para configurar tu proveedor de WhatsApp)

6. Configura tu proveedor de WhatsApp para enviar mensajes a la URL del webhook.

7. Activa el flujo de trabajo en n8n.

## Funcionamiento del Sistema

### Flujo de trabajo completo

1. El cliente envía un mensaje por WhatsApp (por ejemplo, preguntando por un Toyota Corolla 2023).

2. El mensaje es recibido por el webhook de n8n y enviado a Claude.

3. Claude analiza el mensaje y decide qué herramienta del MCP utilizar:
   - Si es una consulta general sobre vehículos, usa `search-vehicles`
   - Si pide detalles específicos, usa `get-vehicle-details`
   - Si solicita una factura, usa `generate-invoice`

4. El servidor MCP procesa la solicitud y devuelve los resultados a Claude.

5. Claude formula una respuesta amigable basada en los resultados y la envía a n8n.

6. n8n envía la respuesta al cliente por WhatsApp.

7. Si se genera una factura en PDF, n8n la envía como documento adjunto por WhatsApp.

### Ejemplos de uso

#### Consulta de vehículos
- Cliente: "¿Tienen Toyota Corolla 2023?"
- Asistente: "Sí, tenemos el Toyota Corolla 2023 disponible por $25,000. Cuenta con motor 1.8L 4-cilindros y transmisión CVT. ¿Le gustaría más información o una factura proforma?"

#### Solicitud de factura
- Cliente: "Me gustaría una factura proforma para el Toyota Corolla"
- Asistente: "Por supuesto. Para generar la factura necesito algunos datos. ¿Podría proporcionarme su nombre completo, correo electrónico, número de teléfono, dirección y número de identificación?"
- Cliente: [Proporciona la información]
- Asistente: "Gracias. He generado su factura proforma. En un momento la recibirá."
- [El cliente recibe el PDF de la factura]

## Personalización y Escalamiento

### Añadir más funcionalidades

Para añadir más herramientas al servidor MCP:

1. Define una nueva herramienta en `src/index.ts` siguiendo el patrón existente:
   ```typescript
   server.tool(
     "nombre-herramienta",
     { 
       parametro1: z.string().describe("descripción"),
       // más parámetros...
     },
     async ({ parametro1, ... }) => {
       // implementación
       return {
         content: [{ type: "text", text: "resultado" }]
       };
     }
   );
   ```

2. Recompila el servidor con `npm run build`.

### Integración con sistemas existentes

Para integrar con sistemas CRM o ERP existentes:

1. Modifica las funciones de herramientas para que consulten APIs o bases de datos de tus sistemas.
2. Implementa autenticación y autorización apropiadas.
3. Considera usar variables de entorno para las credenciales sensibles.

## Solución de problemas

### El servidor MCP no se inicia
- Verifica que Node.js esté instalado y sea v16 o superior.
- Confirma que todas las dependencias están instaladas (`npm install`).
- Revisa los logs en la carpeta del proyecto.

### Claude no detecta las herramientas MCP
- Verifica que la ruta en `claude_desktop_config.json` sea correcta y absoluta.
- Reinicia Claude completamente.
- Revisa los logs de Claude para ver errores de conexión.

### Los mensajes de WhatsApp no llegan a n8n
- Verifica que el webhook esté activo en n8n.
- Confirma que la URL del webhook está correctamente configurada en tu proveedor de WhatsApp.
- Revisa los logs de n8n para errores de conexión.

### Las facturas PDF no se generan
- Verifica que las carpetas `invoices` y `temp` existan y tengan permisos de escritura.
- Revisa los logs del servidor para errores específicos.

## Mantenimiento

Para mantener el sistema funcionando correctamente:

1. Actualiza regularmente el inventario de vehículos.
2. Monitorea el espacio en disco donde se almacenan los PDFs.
3. Actualiza las dependencias periódicamente para mantener la seguridad.

## Soporte y Recursos

- Documentación de MCP: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- Documentación de Claude: [anthropic.com/docs](https://www.anthropic.com/docs)
- Documentación de n8n: [docs.n8n.io](https://docs.n8n.io/)
