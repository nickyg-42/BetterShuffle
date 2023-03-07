const express = require('express');
const app = express();
const port = process.env.PORT || 8383;
const querystring = require('querystring');
const axios = require("axios");
var user_access_token = "";

if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const cors = require('cors');

app.use(cors());
app.use(express.static('public'));

// delete temp playlist
app.get('/delete/:playlistToDelete', function(req, res) {
  var playlistId = req.params.playlistToDelete;

  axios({
    method: 'delete',
    url: `https://api.spotify.com/v1/playlists/${playlistId}/followers`,
    headers: {
      'content-type': 'application/json',
      Authorization: user_access_token,
    },
  })
  .catch(error => console.log('Failed to delete temp:', error.code, error.response.status));
});

// get devices
app.get('/devices', function(req, res) {
  axios({
    method: 'get',
    url: 'https://api.spotify.com/v1/me/player/devices',
    headers: {
      'content-type': 'application/json',
      Authorization: user_access_token,
    },
  })
  .then(response => {
    if (response.status === 200) {
      res.send(JSON.stringify(response.data));
    }
  })
  .catch(err => console.log('Failed to get devices:', err.code, err.response.status));
});

// shuffle temp playlist
app.get('/shuffle/:userId/:playlistId/:playlistName/:deviceId', function(req, res) {
  var plId = req.params.playlistId;
  var userId = req.params.userId;
  var playlistName = req.params.playlistName;
  var deviceId = req.params.deviceId;
  var tracks = [];

  //create dummy playlist
  axios({
    method: 'post',
    url: `https://api.spotify.com/v1/users/${userId}/playlists`,
    data: {
      name: "Copy of " + playlistName,
      description: "temporary copy of " + playlistName,
      public: "false",
    },
    headers: {
      'content-type': 'application/json',
      Authorization: user_access_token,
    },
  })
  .then(response => {
    if (response.status === 201) {
      // get newly created playlist id
      var tempPlId = response.data.id;

      // get tracks from user selected playlist
      axios({
        method: 'get',
        url: `https://api.spotify.com/v1/playlists/${plId}/tracks?fields=total,items%28track.id%2C%20track.name%29`,
        headers: {
          'content-type': 'application/json',
          Authorization: user_access_token,
        },
      })
      .then(response => {
        if (response.status === 200) {
          //add first 100
          var total = response.data.total;
          var trackIds = response.data.items;
          var offset = 100;

          var copyTotal = total - 100;

          for (var i = 0; i < trackIds.length; i++) {
            tracks.push({id: "spotify:track:" + trackIds[i].track.id, name: trackIds[i].track.name });
          }
          
          var num = 0;

          if (copyTotal <= 0) {
            num = 0;
          }
          else {
            while (copyTotal > 0) {
              copyTotal -= 100;
              num++;
            }
          }

          let promises = [];

          // if more than 100, keep getting tracks until done
          for (var k = 0; k < num; k++) {
            promises.push(
              axios({
                method: 'get',
                url: `https://api.spotify.com/v1/playlists/${plId}/tracks?offset=${offset}&fields=total,items%28track.id%2C%20track.name%29`,
                headers: {
                  'content-type': 'application/json',
                  Authorization: user_access_token,
                },
              })
              .then(response => {
                if (response.status === 200) {
                  for (var j = 0; j < response.data.items.length; j++) {
                    tracks.push({id: "spotify:track:" + response.data.items[j].track.id, name: response.data.items[j].track.name });
                  }
                }
              })
            );

            offset += 100;
          }

          Promise.all(promises).then(() => {
            // tracks have been acquired. now randomize them and put them in temp
            shuffle(tracks);
            
            let tracksBatch = [];
            let batchPromises = [];

            while (tracks.length > 0) {
              for (let l = 0; l < 100; l++) {
                if (tracks.length === 0) break;
                tracksBatch.push(tracks.shift());
              }

              batchPromises.push(
                axios({
                  method: 'post',
                  url: `https://api.spotify.com/v1/playlists/${tempPlId}/tracks`,
                  data: {
                    "uris": tracksBatch.map(tr => tr.id),
                  },
                  headers: {
                    'content-type': 'application/json',
                    Authorization: user_access_token,
                  },
                })
                .catch(error => console.log('Failed to post to temp:', error.code, error.response.status))
              );

              tracksBatch = [];
            }

            Promise.all(batchPromises).then(() => {
              //toggle shuffle
              axios({
                method: 'put',
                url: `https://api.spotify.com/v1/me/player/shuffle?state=false&device_id=${deviceId}`,
                headers: {
                  'content-type': 'application/json',
                  Authorization: user_access_token,
                },
              })
              .catch(error => console.log('Failed to update shuffle state:', error.code, error.response.status))
              .then(() => {
                //play temp playlist 
                axios({
                  method: 'put',
                  url: `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
                  data: {
                    context_uri: `spotify:playlist:${tempPlId}`,
                  },
                  headers: {
                    'content-type': 'application/json',
                    Authorization: user_access_token,
                  },
                })
                .catch(error => console.log('Failed to update playback state:', error.code, error.response.status));

                //send playlist id back to frontend
                res.send({tempId: tempPlId});
              });
            });
          });
        }
      });
    }
  });
});

//get users playlists
app.get('/playlists', function(req, res) {
  axios({
    method: 'get',
    url: 'https://api.spotify.com/v1/me/playlists?limit=50',
    headers: {
      'content-type': 'application/json',
      Authorization: user_access_token,
    },
  })
  .then(response => {
    if (response.status === 200) {
      res.send(JSON.stringify(response.data));
    }
  })
  .catch(err => console.log('Failed to get playlists:', err.code, err.response.status));
});

//get user id
app.get('/user', function(req, res) {
  axios({
    method: 'get',
    url: 'https://api.spotify.com/v1/me',
    headers: {
      'content-type': 'application/json',
      Authorization: user_access_token,
    },
  })
  .then(response => {
    if (response.status === 200) {
      res.send(JSON.stringify(response.data));
    }
  })
  .catch(err => console.log('Failed to get user:', err.code, err.response.status));
});

// callback function after OAuth
app.get('/home', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;

  axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      state: state,
      redirect_uri: process.env.REDIRECT_URI,
    }),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${new Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64')}`,
    },
  })
  .then(response => {
    if (response.status === 200) {
      const { access_token, token_type } = response.data;
      user_access_token = token_type + ' ' + access_token;
      res.redirect("main.html");
    } else {
      res.send(response);
    }
  })
  .catch(error => console.log('Failed to post token:', error.code, error.response.status));
});

//spotify authentification
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  var scope = "user-read-playback-state user-modify-playback-state playlist-modify-private playlist-modify-public playlist-read-private user-read-private user-read-email";

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.REDIRECT_URI,
      state: state,
      show_dialog: "true",
    }));
});

app.listen(port, () => {
    console.log(`Server has started on port: ${port}`);
})

const generateRandomString = (myLength) => {
  const chars =
    "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
  const randomArray = Array.from(
    { length: myLength },
    (v, k) => chars[Math.floor(Math.random() * chars.length)]
  );

  const randomString = randomArray.join("");
  return randomString;
};

//shuffle playlist
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}