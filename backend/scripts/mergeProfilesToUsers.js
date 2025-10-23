require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    // 1️⃣ Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ Missing MONGO_URI in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const profiles = db.collection("profiles");
    const users = db.collection("users");

    // 2️⃣ Fetch all profile docs
    const allProfiles = await profiles.find({}).toArray();
    console.log(`📦 Found ${allProfiles.length} documents in 'profiles'.`);

    let migratedCount = 0;
    for (const p of allProfiles) {
      const email = (p.email || "").toLowerCase();

      // Skip if same email already exists in users
      const exists = await users.findOne({ email });
      if (exists) {
        console.log(`⚠️ Skipping existing user: ${email}`);
        continue;
      }

      // Prepare new document
      const newDoc = {
        ...p,
        migratedFromProfiles: true,
        migratedAt: new Date(),
      };

      delete newDoc._id; // Let Mongo create a new _id
      await users.insertOne(newDoc);
      migratedCount++;
    }

    console.log(`✅ Migration done! ${migratedCount} profiles moved to 'users'.`);

    const totalUsers = await users.countDocuments();
    console.log(`📊 Total users now in 'users': ${totalUsers}`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected cleanly.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();
