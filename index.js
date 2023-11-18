const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://husseinalkattash2023:IwIWfM53o3xSBUpH@cluster0.9idd3oa.mongodb.net/');

// Create a mongoose schema for the product
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  rating: Number,
  image: String,
});

const Product = mongoose.model('Product', productSchema);

app.use(bodyParser.json());

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Specify the destination folder for uploaded files
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname); // Set the file name
    },
  });
  
  const upload = multer({ storage: storage });

// Serve the 'uploads/' directory as static content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add a new product with an image upload
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const newProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      rating: req.body.rating,
      image: req.file ? req.file.filename : '', // Set the image filename in the database
    });

    const savedProduct = await newProduct.save();
    res.json(savedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a product by ID
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
      // Find the existing product
      const existingProduct = await Product.findById(req.params.id);
  
      // Delete the old image file if it exists
      if (existingProduct && existingProduct.image) {
        const oldImagePath = path.join(__dirname, 'uploads', existingProduct.image);
        fs.unlinkSync(oldImagePath); // Delete the old image file
      }
  
      // Update the product with the new data and image
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          description: req.body.description,
          price: req.body.price,
          category: req.body.category,
          rating: req.body.rating,
          image: req.file ? req.file.filename : '', // Set the updated image filename in the database
        },
        { new: true }
      );
      res.json(updatedProduct);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  

// Delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
    try {
      const deletedProduct = await Product.findByIdAndDelete(req.params.id);
  
      // Remove the associated image file when deleting a product
      if (deletedProduct && deletedProduct.image) {
        const imagePath = path.join(__dirname, 'uploads', deletedProduct.image);
        fs.unlinkSync(imagePath); // Delete the image file
      }
  
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

// Get all products
app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      console.error(error); // Log the error
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Get a product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.json(product);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

