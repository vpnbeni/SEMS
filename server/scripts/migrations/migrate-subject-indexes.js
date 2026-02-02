require('dotenv').config();
const mongoose = require('mongoose');

async function migrateIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('subjects');
    
    console.log('\n=== Current indexes ===');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  ${idx.name}:`, JSON.stringify(idx.key));
    });
    
    // Drop the old unique index on code alone
    try {
      console.log('\n=== Dropping old code_1 index ===');
      await collection.dropIndex('code_1');
      console.log('Successfully dropped code_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index code_1 does not exist (already dropped)');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }
    
    // Create the new compound unique index
    console.log('\n=== Creating compound unique index (code + class) ===');
    try {
      await collection.createIndex(
        { code: 1, class: 1 }, 
        { unique: true, name: 'code_1_class_1' }
      );
      console.log('Successfully created code_1_class_1 unique index');
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log('Index already exists');
      } else {
        console.error('Error creating index:', error.message);
      }
    }
    
    console.log('\n=== Final indexes ===');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
    });
    
    await mongoose.connection.close();
    console.log('\nMigration complete!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateIndexes();
