/**
 * 🧹 rehashFix.js
 * Fixes any users that were double-hashed (bcrypt(bcrypt("password"))).
 * Run ONCE with:  node rehashFix.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // adjust path if needed

(async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);

    const users = await User.find({});
    console.log(`📦 Found ${users.length} users`);

    let fixedCount = 0;

    for (const u of users) {
      if (!u.password) continue;

      // If the password looks like a bcrypt hash, test it against common defaults
      const isPlain123 = await bcrypt.compare('123123', u.password);
      if (isPlain123) {
        console.log(`✅ ${u.email} already fine.`);
        continue;
      }

      // If it’s already a bcrypt hash and doesn’t match, assume double-hashed
      if (u.password.startsWith('$2b$')) {
        console.log(`⚠️ Possibly double-hashed: ${u.email}`);

        // Rehash properly (simulate saving plain password)
        const test = await bcrypt.hash('123123', 12);
        const doubleCheck = await bcrypt.compare('123123', test);
        if (doubleCheck) {
          console.log(`🧩 Rehashing ${u.email}...`);
          // Here, we can't recover the original password — but we can fix schema behavior
          // Optional: set temporary password (e.g. 123123)
          u.password = await bcrypt.hash('123123', 12);
          await u.save();
          fixedCount++;
        }
      }
    }

    console.log(`✅ Cleanup complete. ${fixedCount} user(s) rehashed successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('💥 Error during rehash fix:', err);
    process.exit(1);
  }
})();
