const logout = document.getElementById('logout');
const dropdown = document.getElementById('devices');
const apply = document.getElementById('apply');
const warn = document.getElementById('warn');
const playlistsDiv = document.getElementById('ps');
var playlists = [];
var owner = "";
var deviceId = "";

apply.addEventListener('click', () => {
    var selection = dropdown.value;

    if (selection === "none") {
        warn.style.display = "block";
        playlistsDiv.style.display = "none";
    }
    else {
        warn.style.display = "none";
        playlistsDiv.style.display = "block";

        deviceId = selection;
    }
})

document.addEventListener('DOMContentLoaded', () => {
    fetch('http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com/devices', {
        method: 'GET'
    })
    .then((response) => response.json())
    .then(data => {
        for (let l = 0; l < data.devices.length; l++) {
            var curr = data.devices[l];
            var opt = document.createElement("option");
            opt.text = curr.name + " - " + curr.type;
            opt.value = curr.id;
            dropdown.append(opt);
        }
    })
    .catch(error => alert(error));

    fetch('http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com/user', {
        method: 'GET'
    })
    .then((response) => response.json())
    .then(data => {
        owner = data.id;
    })
    .catch(err => alert(err));

    fetch('http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com/playlists', {
        method: 'GET'
    })
    .then((response) => response.json())
    .then(data => {
        for (let i = 0; i < data.items.length; i++) {
            var curr = data.items[i];

            if (curr.owner.id === owner) playlists.push({ 
                trackCount: curr.tracks.total, 
                image: curr.images[0] ? curr.images[0].url : null,
                id: curr.id, 
                name: curr.name 
            });
        }

        var container = document.getElementById('ps');

        playlists.forEach((x) => {
            var playlistDiv = document.createElement("div");
            
            var imgDiv = document.createElement("div");
            var titleDiv = document.createElement("div");
            var shuffleDiv = document.createElement("div");
            var trackCountDiv = document.createElement("div");

            var img = document.createElement("img");
            var shBtn = document.createElement("button");

            playlistDiv.className = "playlist";

            imgDiv.className = "playlist__art"

            img.src = x.image;
            img.width = "100";
            img.height = "100";
            img.alt = "playlist image"

            titleDiv.className = "playlist__title";
            titleDiv.innerHTML = x.name;

            shuffleDiv.className = "playlist__shuffle";
            shBtn.textContent = "Shuffle";
            shBtn.id = x.id;
            shBtn.className = "shuffle";
            shBtn.name = x.name;

            trackCountDiv.className = "playlist__length";
            trackCountDiv.innerHTML = "Tracks: " + x.trackCount;

            imgDiv.append(img);
            shuffleDiv.append(shBtn);

            playlistDiv.append(imgDiv);
            playlistDiv.append(titleDiv);
            playlistDiv.append(shuffleDiv);
            playlistDiv.append(trackCountDiv);

            container.append(playlistDiv);
            container.append(document.createElement("br"));
        })

        var buttons = document.getElementsByClassName("shuffle");

        for (var k = 0; k < buttons.length; k++) {
            buttons[k].addEventListener('click', (e) => {
                fetch(`http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com/shuffle/${owner}/${e.target.id}/${e.target.name}/${deviceId}`, {
                    method: 'GET'
                })
                .then((response) => response.json())
                .then(data => {
                    fetch(`http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com/delete/${data.tempId}`, {
                        method: 'GET',
                    })
                    .catch(err => console.log(err));
                });
            })
        }
    })
    .catch(err => alert(err));
});

logout.addEventListener('click', () => {
    window.location.href = "index.html";
});