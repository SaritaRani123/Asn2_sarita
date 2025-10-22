/*********************************************************************************
 * ITE5315 – Assignment 2
 * I declare that this assignment is my own work in accordance with Humber Academic Policy.
 * No part of this assignment has been copied manually or electronically from any other source
 * (including web sites) or distributed to other students.
 *
 * Name: Sarita Rani   Student ID: N01696421   Date: 22-10-2025
 *
 ********************************************************************************/

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const exphbs = require('express-handlebars');

const app = express();
const port = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.use(express.urlencoded({ extended: true }));   // parse form data
app.use(express.static(path.join(__dirname, 'public')));   

// ---------------- HANDLEBARS ENGINE ----------------
const hbs = exphbs.create({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    get: (obj, key) => obj[key], // Access keys with spaces
   
    // Custom helper for empty names 
    nameOrNA: function (name) {
      if (!name || name.trim() === '') {
        // highlight empty names
        return '<span style="color:red; font-weight:bold;">N/A</span>';
      }
      return name;
    },
    // helper needed for highlighting rows with empty names
    isEmptyName: function (name, options) {
      if (!name || name.trim() === '') {
        return options.fn(this);   // Render block if name is empty
      }
      return options.inverse(this); // Otherwise render the else block
    }
  }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

// ---------------- LOAD JSON DATA ----------------
async function loadAirbnbData() {// load JSON data from file
  try {
    const data = await fs.readFile(path.join(__dirname, 'airbnb_with_photos.json'), 'utf8');
    const jsonData = JSON.parse(data);
    console.log('Loaded JSON items:', jsonData.length);
    return jsonData;
  } catch (err) {
    console.error('Error loading JSON:', err);
    return [];
  }
}

// ---------------- ROUTES ----------------

// Home page
app.get('/', async (req, res) => {
  res.render('index', { title: 'Airbnb Dashboard' });  // render homepage
});

// Show all Airbnb data
// app.get('/allData', async (req, res) => {
//   const data = await loadAirbnbData();
//   console.log('Rendering /allData with items:', data.length);
//   res.render('allData', { title: 'All Airbnb Properties', data });
// });

// ---------------- SHOW LIMITED AIRBNB DATA ----------------
app.get('/allData', async (req, res) => {
  const data = await loadAirbnbData();
  console.log('Rendering /allData with items:', data.length);

  // Show only the first 100 records
  const limitedData = data.slice(0, 100);   // limit records

  res.render('allData', {
    title: 'All Airbnb Properties',
    data: limitedData,
    useIdLink: false // enable index based View Details link
  });
});


// Property details by index
app.get('/allData/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const data = await loadAirbnbData();
    if (!Number.isInteger(index) || index < 0 || index >= data.length) {
      return res.render('error', { title: 'Error', message: 'Record not found' });
    }
    res.render('propertyDetails', { title: 'Property Details', data: data[index] });    // show property by index
  } catch (err) {
    res.render('error', { title: 'Error', message: 'Failed to load property details' });
  }
});

// Property details by ID (needed for filtered data to show correct property details)
app.get('/allData/id/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;
    const data = await loadAirbnbData();

    // Find property by ID
    const property = data.find(p => String(p.id) === propertyId);

    if (!property) {
      return res.render('error', { title: 'Error', message: 'Property not found' });
    }

    res.render('propertyDetails', { title: 'Property Details', data: property });    // show property by ID
  } catch (err) {
    console.error('Error loading property by ID:', err);
    res.render('error', { title: 'Error', message: 'Failed to load property details' });
  }
}); 


// ---------------- SEARCH BY ID ----------------
app.get('/searchProperty', async (req, res) => {
  res.render('searchProperty', { title: 'Search Property by ID' });  // render search form
});

app.post(
  '/searchProperty',
  body('property_id')
    .notEmpty().withMessage('Property ID is required')
    .isNumeric().withMessage('Property ID must be numeric')
    .trim()
    .escape(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('searchProperty', { title: 'Search Property by ID', errors: errors.array() });
      }

      const propertyId = req.body.property_id;
      const data = await loadAirbnbData();

      // Search property by ID
      const property = data.find(p => String(p.id) === propertyId);       
      if (!property) {
        return res.render('error', { title: 'Error', message: `Property ID ${propertyId} not found` });
      }

      // Wrap single object in array to reuse searchResults.hbs
      res.render('searchResults', { title: `Property ID ${propertyId} Details`, data: [property] });
    } catch (err) {
      res.render('error', { title: 'Error', message: 'Failed to search property by ID' });
    }
  }
);

// ---------------- SEARCH BY NAME ----------------
app.get('/searchName', async (req, res) => {
  res.render('searchName', { title: 'Search Property by Name' }); // render name search form
});

app.post(
  '/searchName',
  body('property_name')
    .notEmpty().withMessage('Property Name is required')
    .trim()
    .escape(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('searchName', { title: 'Search Property by Name', errors: errors.array() });
      }

      const searchName = (req.body.property_name || '').toLowerCase();
      const data = await loadAirbnbData();

      const matchedProperties = data.filter(p => (p.NAME || '').toLowerCase().includes(searchName)); // filter by name

      if (!matchedProperties.length) {
        return res.render('error', { title: 'No Results', message: `No properties found containing "${req.body.property_name}"` });
      }

      res.render('searchResults', { title: `Properties matching "${req.body.property_name}"`, data: matchedProperties });
    } catch (err) {
      console.error(err);
      res.render('error', { title: 'Error', message: 'Failed to search property by name' });
    }
  }
);

// ---------------- VIEW DATA (TABLE FORMAT) ----------------
// app.get('/viewData', async (req, res) => {
//   try {
//     const data = await loadAirbnbData();

//     if (!data || data.length === 0) {
//       return res.render('error', { title: 'Error', message: 'No data available to display.' });
//     }

//     res.render('viewData', {
//       title: 'All Airbnb Data (Table View)',
//       data
//     });
//   } catch (err) {
//     console.error('Error rendering /viewData:', err);
//     res.render('error', { title: 'Error', message: 'Failed to load data for viewData.' });
//   }
// });

// ---------------- VIEW DATA (TABLE FORMAT, LIMITED) ----------------
app.get('/viewData', async (req, res) => {
  try {
    const data = await loadAirbnbData();

    if (!data || data.length === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'No data available to display.'
      });
    }

    //  Show only the first 100 records
    const limitedData = data.slice(0, 100);

    res.render('viewData', {
      title: 'All Airbnb Data (Table View)',
      data: limitedData,
      useIdLink: false // enable index based View Details link
    });
  } catch (err) {
    console.error('Error rendering /viewData:', err);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load data for viewData.'
    });
  }
});

// ---------------- VIEW CLEAN DATA (REMOVE EMPTY NAMES) ----------------
app.get('/viewData/clean', async (req, res) => {
  try {
    const data = await loadAirbnbData();

    if (!data || data.length === 0) {
      return res.render('error', {
        title: 'Error',
        message: 'No data available to display.'
      });
    }

    // Filter out records where NAME is missing or empty
    const cleanedData = data.filter(item => item.NAME && item.NAME.trim() !== '');

    // Limit to first 100 records for performance
    const limitedCleanData = cleanedData.slice(0, 100);

    res.render('viewData', {
      title: 'Clean Airbnb Data (No Empty Names)',
      data: limitedCleanData,
      useIdLink: true // enable ID based View Details link
    });
  } catch (err) {
    console.error('Error rendering /viewData/clean:', err);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load clean data for viewData/clean.'
    });
  }
});

// ---------------- VIEW DATA BY PRICE RANGE ----------------
app.get('/priceFilter', async (req, res) => {
  res.render('priceFilter', { title: 'Filter Airbnb by Price Range' }); // render price filter form
});

app.post(
  '/viewData/price',
  [
    body('minPrice')
      .notEmpty().withMessage('Minimum price is required')
      .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number')
      .trim()
      .escape(),
    body('maxPrice')
      .notEmpty().withMessage('Maximum price is required')
      .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
      .trim()
      .escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {   // handle validation errors
      return res.render('priceFilter', {
        title: 'Filter Airbnb by Price Range',
        errors: errors.array()
      });
    }

    let { minPrice, maxPrice } = req.body;
    minPrice = parseFloat(minPrice);
    maxPrice = parseFloat(maxPrice);

    if (minPrice > maxPrice) { // check price logic
      return res.render('priceFilter', {
        title: 'Filter Airbnb by Price Range',
        errors: [{ msg: 'Minimum price cannot be greater than maximum price' }]
      });
    }

    try {
      const data = await loadAirbnbData();

      // Convert and clean prices before filtering
      const filteredData = data.filter(item => {
        if (!item.price) return false;

        // Convert strings to a float
        const priceValue = parseFloat(
          String(item.price).replace(/[^0-9.]/g, '')  // clean price
        );

        // Ignore invalid prices
        if (isNaN(priceValue)) return false;

        return priceValue >= minPrice && priceValue <= maxPrice;
      });

      if (!filteredData.length) {
        return res.render('error', {   // no results
          title: 'No Results',
          message: `No properties found between $${minPrice} and $${maxPrice}`
        });
      }

      // Show filtered results
      res.render('viewData', {
        title: `Properties Priced Between $${minPrice} and $${maxPrice}`,
        data: filteredData,
        useIdLink: true // enable ID based View Details link
      });
    } catch (err) {
      console.error('Error filtering by price:', err);
      res.render('error', { title: 'Error', message: 'Failed to filter properties by price.' });
    }
  }
);

// ---------------- OTHER ROUTES ----------------
app.get('/users', async (req, res) => {
  res.send('respond with a resource');
});

// Catch-all route
app.use(async (req, res) => {
  res.render('error', { title: 'Error', message: 'Wrong Route' });  // handle unknown routes
});

// ---------------- START SERVER ----------------
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
