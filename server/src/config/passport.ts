import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/user.model.js";
import { findOrCreateGoogleUser } from "../services/user.service.js";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL ??
  "http://localhost:5000/api/users/auth/google/callback";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user ?? false);
  } catch (error) {
    done(error);
  }
});

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        state: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const verifiedEmail = profile.emails?.find(
            (email) => email.verified
          )?.value;

          if (!verifiedEmail) {
            done(null, false);
            return;
          }

          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email: verifiedEmail,
            fullName: profile.displayName || verifiedEmail,
          });

          done(null, user);
        } catch (error) {
          done(
            error instanceof Error ? error : new Error("Google sign-in failed")
          );
        }
      }
    )
  );
}

export const isGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret
);

export default passport;
