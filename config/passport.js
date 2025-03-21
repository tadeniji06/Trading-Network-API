const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
// Add at the top of your passport.js file
console.log('Initializing Passport with Google strategy');
// Initialize Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL || ''}/api/auth/google/callback`,
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract email from profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }
        
        // Check if user already exists by googleId or email
        let user = await User.findOne({ 
          $or: [{ googleId: profile.id }, { email: email }] 
        });

        // Flag to determine if this is a new user
        const isNewUser = !user;

        if (user) {
          // If user exists but doesn't have googleId (found by email), update the googleId
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: email,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });
        }

        // Add isNewUser property to the user object
        user.isNewUser = isNewUser;
        
        return done(null, user);
      } catch (err) {
        console.error('Error in Google strategy:', err);
        return done(err, null);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
