// dealership-mcp-server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Simulación de base de datos de vehículos
// En producción, esto se conectaría a su sistema de inventario real
const vehicleDatabase = [
  {
    id: "1",
    brand: "Toyota",
    model: "Corolla",
    year: 2023,
    price: 25000,
    specs: {
      engine: "1.8L 4-cylinder",
      transmission: "CVT",
      fuelType: "Gasoline",
      mileage: "32 city / 40 highway mpg"
    },
    images: ["corolla_2023_front.jpg", "corolla_2023_side.jpg"],
    available: true
  },
  {
    id: "2",
    brand: "Honda",
    model: "Civic",
    year: 2023,
    price: 24500,
    specs: {
      engine: "2.0L 4-cylinder",
      transmission: "CVT",
      fuelType: "Gasoline",
      mileage: "31 city / 40 highway mpg"
    },
    images: ["civic_2023_front.jpg", "civic_2023_side.jpg"],
    available: true
  },
  {
    id: "3",
    brand: "Ford",
    model: "Mustang",
    year: 2023,
    price: 45000,
    specs: {
      engine: "5.0L V8",
      transmission: "10-speed automatic",
      fuelType: "Gasoline",
      mileage: "15 city / 24 highway mpg"
    },
    images: ["mustang_2023_front.jpg", "mustang_2023_side.jpg"],
    available: true
  },
  {
    id: "4",
    brand: "Tesla",
    model: "Model 3",
    year: 2023,
    price: 55000,
    specs: {
      engine: "Electric motor",
      transmission: "Single-speed",
      fuelType: "Electric",
      mileage: "138 city / 126 highway MPGe"
    },
    images: ["model3_2023_front.jpg", "model3_2023_side.jpg"],
    available: true
  },
  {
    id: "5",
    brand: "BMW",
    model: "X5",
    year: 2023,
    price: 65000,
    specs: {
      engine: "3.0L inline-6",
      transmission: "8-speed automatic",
      fuelType: "Gasoline",
      mileage: "21 city / 26 highway mpg"
    },
    images: ["x5_2023_front.jpg", "x5_2023_side.jpg"],
    available: true
  }
];

// Directorios para almacenamiento de archivos
const INVOICE_DIR = path.join(process.cwd(), 'invoices');
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Función para asegurar que los directorios existan
async function ensureDirectories() {
  try {
    await fs.mkdir(INVOICE_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.error(`Directorios creados o verificados: ${INVOICE_DIR}, ${TEMP_DIR}`);
  } catch (error) {
    console.error('Error al crear directorios:', error);
  }
}

// Crear el servidor MCP
const server = new McpServer({
  name: "dealership-assistant",
  version: "1.0.0"
});

// Herramienta para buscar vehículos
server.tool(
  "search-vehicles",
  { 
    brand: z.string().optional().describe("Marca del vehículo (ej. Toyota)"),
    model: z.string().optional().describe("Modelo del vehículo (ej. Corolla)"),
    year: z.number().optional().describe("Año del vehículo (ej. 2023)"),
    maxPrice: z.number().optional().describe("Precio máximo en USD")
  },
  async ({ brand, model, year, maxPrice }) => {
    console.error(`Buscando vehículos con: marca=${brand}, modelo=${model}, año=${year}, precio máximo=${maxPrice}`);
    
    let results = [...vehicleDatabase];
    
    if (brand) {
      results = results.filter(v => v.brand.toLowerCase().includes(brand.toLowerCase()));
    }
    
    if (model) {
      results = results.filter(v => v.model.toLowerCase().includes(model.toLowerCase()));
    }
    
    if (year) {
      results = results.filter(v => v.year === year);
    }
    
    if (maxPrice) {
      results = results.filter(v => v.price <= maxPrice);
    }
    
    // Filtrar solo vehículos disponibles
    results = results.filter(v => v.available);
    
    // Formatear los resultados para una mejor presentación
    const formattedResults = results.map(vehicle => ({
      id: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      price: `$${vehicle.price.toLocaleString()}`,
      available: vehicle.available
    }));
    
    return {
      content: [
        { 
          type: "text", 
          text: formattedResults.length > 0 
            ? JSON.stringify(formattedResults, null, 2)
            : "No se encontraron vehículos que coincidan con los criterios de búsqueda."
        }
      ]
    };
  }
);

// Herramienta para obtener detalles completos de un vehículo específico
server.tool(
  "get-vehicle-details",
  { 
    vehicleId: z.string().describe("ID del vehículo")
  },
  async ({ vehicleId }) => {
    console.error(`Obteniendo detalles del vehículo ID: ${vehicleId}`);
    
    const vehicle = vehicleDatabase.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return {
        content: [{ type: "text", text: `No se encontró ningún vehículo con ID: ${vehicleId}` }],
        isError: true
      };
    }
    
    const detailsText = `
DETALLES DEL VEHÍCULO:
ID: ${vehicle.id}
Marca: ${vehicle.brand}
Modelo: ${vehicle.model}
Año: ${vehicle.year}
Precio: $${vehicle.price.toLocaleString()}

ESPECIFICACIONES:
Motor: ${vehicle.specs.engine}
Transmisión: ${vehicle.specs.transmission}
Tipo de combustible: ${vehicle.specs.fuelType}
Rendimiento: ${vehicle.specs.mileage}

Estado: ${vehicle.available ? "Disponible" : "No disponible"}
    `;
    
    return {
      content: [{ type: "text", text: detailsText }]
    };
  }
);

// Herramienta para generar una factura proforma en PDF
server.tool(
  "generate-invoice",
  { 
    vehicleId: z.string().describe("ID del vehículo"),
    customerName: z.string().describe("Nombre completo del cliente"),
    customerEmail: z.string().email().describe("Email del cliente"),
    customerPhone: z.string().describe("Teléfono del cliente"),
    customerAddress: z.string().describe("Dirección del cliente"),
    customerID: z.string().describe("Número de identificación del cliente (DNI, pasaporte, etc.)"),
  },
  async ({ vehicleId, customerName, customerEmail, customerPhone, customerAddress, customerID }) => {
    console.error(`Generando factura para vehículo ID: ${vehicleId}, cliente: ${customerName}`);
    
    // Asegurar que los directorios existan
    await ensureDirectories();
    
    // Buscar el vehículo
    const vehicle = vehicleDatabase.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return {
        content: [{ type: "text", text: `No se encontró ningún vehículo con ID: ${vehicleId}` }],
        isError: true
      };
    }
    
    if (!vehicle.available) {
      return {
        content: [{ type: "text", text: `El vehículo con ID: ${vehicleId} no está disponible para la venta.` }],
        isError: true
      };
    }

    try {
      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Tamaño carta
      
      // Obtener una fuente estándar
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Configurar dimensiones
      const { width, height } = page.getSize();
      
      // Agregar encabezado
      page.drawText('FACTURA PROFORMA', {
        x: 50,
        y: height - 50,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0.8)
      });
      
      // Agregar fecha
      const today = new Date();
      const dateString = today.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      page.drawText(`Fecha: ${dateString}`, {
        x: 450,
        y: height - 50,
        size: 12,
        font
      });
      
      // Número de factura (generado aleatoriamente para demo)
      const invoiceNumber = `INV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      page.drawText(`Factura #: ${invoiceNumber}`, {
        x: 450,
        y: height - 70,
        size: 12,
        font
      });
      
      // Logo y datos del concesionario (textos simulados)
      page.drawText('AUTOMOTORES DEL FUTURO S.A.', {
        x: 50,
        y: height - 100,
        size: 16,
        font: boldFont
      });
      
      page.drawText('Av. Principal 1234, Ciudad', {
        x: 50,
        y: height - 120,
        size: 10,
        font
      });
      
      page.drawText('Tel: +123 456 7890', {
        x: 50,
        y: height - 135,
        size: 10,
        font
      });
      
      page.drawText('RUC: 12345678901', {
        x: 50,
        y: height - 150,
        size: 10,
        font
      });
      
      // Datos del cliente
      page.drawText('DATOS DEL CLIENTE:', {
        x: 50,
        y: height - 200,
        size: 14,
        font: boldFont
      });
      
      page.drawText(`Nombre: ${customerName}`, {
        x: 50,
        y: height - 220,
        size: 12,
        font
      });
      
      page.drawText(`ID/RUC: ${customerID}`, {
        x: 50,
        y: height - 240,
        size: 12,
        font
      });
      
      page.drawText(`Dirección: ${customerAddress}`, {
        x: 50,
        y: height - 260,
        size: 12,
        font
      });
      
      page.drawText(`Teléfono: ${customerPhone}`, {
        x: 50,
        y: height - 280,
        size: 12,
        font
      });
      
      page.drawText(`Email: ${customerEmail}`, {
        x: 50,
        y: height - 300,
        size: 12,
        font
      });
      
      // Detalles del vehículo
      page.drawText('DETALLES DEL VEHÍCULO:', {
        x: 50,
        y: height - 350,
        size: 14,
        font: boldFont
      });
      
      page.drawText(`Marca: ${vehicle.brand}`, {
        x: 50,
        y: height - 370,
        size: 12,
        font
      });
      
      page.drawText(`Modelo: ${vehicle.model}`, {
        x: 50,
        y: height - 390,
        size: 12,
        font
      });
      
      page.drawText(`Año: ${vehicle.year}`, {
        x: 50,
        y: height - 410,
        size: 12,
        font
      });
      
      page.drawText(`Motor: ${vehicle.specs.engine}`, {
        x: 50,
        y: height - 430,
        size: 12,
        font
      });
      
      page.drawText(`Transmisión: ${vehicle.specs.transmission}`, {
        x: 50,
        y: height - 450,
        size: 12,
        font
      });
      
      // Información de precios
      const subtotal = vehicle.price;
      const taxRate = 0.18; // 18% de impuesto
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      
      // Tabla de precios
      page.drawText('DETALLE DE PRECIOS:', {
        x: 50,
        y: height - 500,
        size: 14,
        font: boldFont
      });
      
      // Línea horizontal
      page.drawLine({
        start: { x: 50, y: height - 520 },
        end: { x: 550, y: height - 520 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      // Encabezados
      page.drawText('Descripción', {
        x: 50,
        y: height - 540,
        size: 12,
        font: boldFont
      });
      
      page.drawText('Valor', {
        x: 450,
        y: height - 540,
        size: 12,
        font: boldFont
      });
      
      // Línea horizontal
      page.drawLine({
        start: { x: 50, y: height - 550 },
        end: { x: 550, y: height - 550 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      // Valores
      page.drawText(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`, {
        x: 50,
        y: height - 570,
        size: 12,
        font
      });
      
      page.drawText(`$${subtotal.toLocaleString()}`, {
        x: 450,
        y: height - 570,
        size: 12,
        font
      });
      
      // Línea horizontal
      page.drawLine({
        start: { x: 50, y: height - 590 },
        end: { x: 550, y: height - 590 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      // Subtotal
      page.drawText('Subtotal:', {
        x: 350,
        y: height - 610,
        size: 12,
        font
      });
      
      page.drawText(`$${subtotal.toLocaleString()}`, {
        x: 450,
        y: height - 610,
        size: 12,
        font
      });
      
      // Impuestos
      page.drawText(`IVA (${taxRate * 100}%):`, {
        x: 350,
        y: height - 630,
        size: 12,
        font
      });
      
      page.drawText(`$${tax.toLocaleString()}`, {
        x: 450,
        y: height - 630,
        size: 12,
        font
      });
      
      // Línea horizontal
      page.drawLine({
        start: { x: 350, y: height - 640 },
        end: { x: 550, y: height - 640 },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      // Total
      page.drawText('TOTAL:', {
        x: 350,
        y: height - 660,
        size: 14,
        font: boldFont
      });
      
      page.drawText(`$${total.toLocaleString()}`, {
        x: 450,
        y: height - 660,
        size: 14,
        font: boldFont
      });
      
      // Notas al pie
      page.drawText('NOTAS:', {
        x: 50,
        y: height - 700,
        size: 10,
        font: boldFont
      });
      
      page.drawText('Esta es una factura proforma. No es una factura oficial hasta que se complete la compra.', {
        x: 50,
        y: height - 715,
        size: 10,
        font
      });
      
      page.drawText('Válida por 15 días a partir de la fecha de emisión.', {
        x: 50,
        y: height - 730,
        size: 10,
        font
      });
      
      // Guardar el PDF
      const pdfBytes = await pdfDoc.save();
      
      // Nombre del archivo
      const sanitizedName = customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `invoice_${sanitizedName}_${vehicleId}_${Date.now()}.pdf`;
      const filepath = path.join(INVOICE_DIR, filename);
      
      // Escribir el archivo
      await fs.writeFile(filepath, pdfBytes);
      
      return {
        content: [{ 
          type: "text", 
          text: `Factura generada exitosamente. Archivo: ${filename}\n\nSe ha creado una factura proforma para ${customerName} por un ${vehicle.brand} ${vehicle.model} ${vehicle.year} con un valor total de $${total.toLocaleString()}.` 
        }]
      };
    } catch (error) {
      console.error('Error al generar la factura:', error);
      return {
        content: [{ type: "text", text: `Error al generar la factura: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Inicializar y ejecutar el servidor
async function main() {
  try {
    // Asegurar que los directorios existan desde el inicio
    await ensureDirectories();
    
    // Iniciar el servidor con transporte stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Servidor MCP del concesionario iniciado correctamente');
  } catch (error) {
    console.error('Error al iniciar el servidor MCP:', error);
    process.exit(1);
  }
}

main();
