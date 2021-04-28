import * as express from 'express'
import * as passport from 'passport'
import fetch from 'node-fetch'

import * as strategy from '@riderize/passport-strava-oauth2'
const StravaStrategy = strategy.Strategy;

passport.serializeUser(function (user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function (obj, done) {
    done(null, obj);
  });

var user:any = {}
// Use the StravaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Strava
//   profile), and invoke a callback with a user object.
passport.use(
    new StravaStrategy(
      {
        clientID: "",
        clientSecret: "",
        callbackURL: "",
      },
      async function (accessToken, refreshToken, profile, done) {
        console.log(profile.token)
        console.log(accessToken)
        user = profile
        return done(null, profile);
      }
    )
  );

const app = express();

app.use(passport.initialize());
app.use(passport.session());

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

async function getAthleteActivities() {
  const url = 'https://www.strava.com/api/v3/athlete/activities'
  const options = {
      method: 'GET',
      headers: {
          'Authorization': 'Bearer ' + user.token
      }
  }
  console.log(options)
  const result = await fetch(url, options)
  return await result.json()
}

async function getAthleteActivityStream(activity) {
  const url = 'https://www.strava.com/api/v3/activities/'+activity+'/streams?keys=distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&key_by_type=true&series_type=time'
  const options = {
      method: 'GET',
      headers: {
          'Authorization': 'Bearer ' + user.token
      }
  }
  console.log(options)
  const result = await fetch(url, options)
  return await result.json()
}

app.get('/', function (req, res) {
    getAthleteActivityStream('5166343524').then(json => {
      res.send(json)
    })
});

// GET /auth/strava
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Strava authentication will involve
//   redirecting the user to strava.com.  After authorization, Strava
//   will redirect the user back to this application at /auth/strava/callback
app.get(
  '/auth/strava',
  passport.authenticate('strava', {
    scope: ['profile:read_all,activity:read_all'],
  })
);

// GET /auth/strava/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get(
  '/auth/strava/callback',
  passport.authenticate('strava', {
    failureRedirect: '/login',
    successRedirect: '/',
  })
);

app.listen(4000);