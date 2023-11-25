const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

// Enable CORS for all routes
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/ecommerce');

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

// Define user schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

// Hash password before saving to database
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(user.password, salt);
  user.password = hashedPassword;
  next();
});
const User = mongoose.model('User', userSchema);


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

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});



// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
