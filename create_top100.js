const fs = require('fs').promises;
const path = require('path');

async function createTop100() {
  try {
    // Load the full JSON
    const data = await fs.readFile(path.join(__dirname, 'airbnb_with_photos.json'), 'utf8');
    const jsonData = JSON.parse(data);

    // Take top 100 records
    const top100 = jsonData.slice(0, 100);

    // Save to a new file
    await fs.writeFile(path.join(__dirname, 'airbnb_with_photos_top100.json'), JSON.stringify(top100, null, 2));
    console.log('Top 100 records saved to airbnb_with_photos_top100.json');
  } catch (err) {
    console.error('Error creating top 100 JSON:', err);
  }
}

createTop100();
