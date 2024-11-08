const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Para habilitar CORS si es necesario
const { MongoClient } = require('mongodb'); // Importa MongoClient de mongodb
require('dotenv').config();  

// Crear la app de Express
const app = express();
app.use(express.json()); // Middleware para parsear JSON
app.use(cors()); // Habilitar CORS

// Conexión a MongoDB Atlas
const mongoURI = process.env.MONGO_URI;

// Crear una instancia de MongoClient
const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect()
    .then(() => console.log('Conexión a MongoDB Atlas exitosa'))
    .catch(err => console.error('Error de conexión:', err));

// Acceder a la base de datos
const db = client.db('Bazar'); // Accede a la base de datos 'Bazar'
const productsCollection = db.collection('productcs'); // Accede a la colección 'productcs'
const salesCollection = db.collection('sales');

// Endpoint para obtener productos con filtrado por título
app.get('/api/items', async (req, res) => {
    const query = req.query.q;

    try {
        let products;

        if (!query) {
            // Si no hay parámetro q, devuelve todos los productos
            products = await productsCollection.find().toArray();
        } else {
            // Si se pasa el parámetro q, filtra los productos por título
            products = await productsCollection.find({
                title: { $regex: query, $options: 'i' }  // Filtrado insensible a mayúsculas/minúsculas
            }).toArray();
        }

        res.status(200).json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ message: "Error al obtener productos", error });
    }
});

// Endpoint para obtener detalles de un producto por su ID
app.get('/api/items/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);  // Usamos parseInt para convertir el ID a número

    try {
        const product = await productsCollection.findOne({ id: productId });  // Buscamos por el campo "id" numérico

        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Error al obtener el producto por ID:", error);
        res.status(500).json({ message: "Error al obtener el producto por ID", error });
    }
});

// Endpoint para obtener todas las ventas
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await salesCollection.find().toArray();
        res.status(200).json(sales);
    } catch (error) {
        console.error("Error al obtener las ventas:", error);
        res.status(500).json({ message: "Error al obtener las ventas", error });
    }
});

// Endpoint para realizar una compra de una unidad de producto
app.post('/api/sales', async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        // Verificar si el producto existe
        const product = await productsCollection.findOne({ id: productId });
        if (!product) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // Verificar si hay suficiente stock
        if (product.stock < quantity) {
            return res.status(400).json({ message: "Stock insuficiente" });
        }

        // Calcular el total de la compra
        const total = product.price * quantity;

        // Crear una nueva venta con la cantidad seleccionada
        const sale = {
            productId,
            quantity,
            date: new Date(),
            total,  // Total es el precio del producto multiplicado por la cantidad
        };

        // Insertar la venta en la colección `sales`
        await salesCollection.insertOne(sale);

        // Actualizar el stock del producto reduciendo la cantidad comprada
        await productsCollection.updateOne(
            { id: productId },
            { $inc: { stock: -quantity } }
        );

        res.status(201).json({ message: "Compra realizada con éxito", sale });
    } catch (error) {
        console.error("Error al realizar la compra:", error);
        res.status(500).json({ message: "Error al realizar la compra", error });
    }
});

// Puerto para el servidor Express
const port = process.env.PORT || 5000; 
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});
