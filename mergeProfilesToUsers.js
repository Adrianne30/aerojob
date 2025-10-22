// scripts/mergeProfilesToUsers.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    // ✅ 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // ✅ 2. Get both collections
    const profiles = db.collection('profiles');
    const users = db.collection('users');

    // ✅ 3. Fetch all documents from `profiles`
    const allProfiles = await profiles.find({}).toArray();
    console.log(`📦 Found ${allProfiles.length} profiles to migrate.`);

    let migrated = 0;
    for (const p of allProfiles) {
      // Skip if same email already exists in users
      const exists = await users.findOne({ email: p.email });
      if (exists) {
        console.log(`⚠️ Skipped existing user: ${p.email}`);
        continue;
      }

      // Insert the profile data into users collection
      await users.insertOne({
        ...p,
        migratedFromProfiles: true,
        migratedAt: new Date(),
      });

      migrated++;
    }

    console.log(`✅ Migration complete. ${migrated} new users added to 'users'.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();
