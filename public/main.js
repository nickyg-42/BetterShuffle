const logout = document.getElementById('logout');
const dropdown = document.getElementById('devices');
const playlistsDiv = document.getElementById('ps');
const loader = document.getElementById('loader');
var playlists = [];
var owner = "";
var deviceId = "";
//var serverURL = "http://localhost:8383";
var serverURL = "http://spotifyshufler-env.eba-bdsjpjjn.us-east-1.elasticbeanstalk.com";

dropdown.addEventListener('change', () => {
    var selection = dropdown.value;

    if (selection === "none") {
        playlistsDiv.style.display = "none";
    }
    else {
        playlistsDiv.style.display = "block";

        deviceId = selection;
    }
})

document.addEventListener('DOMContentLoaded', () => {
    fetch(`${serverURL}/devices`, {
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
    .catch(err => alert("Failed to get devices, the server may be down, or the maximum requests may be exceeded for the hour. Dev details:", err));

    fetch(`${serverURL}/user`, {
        method: 'GET'
    })
    .then((response) => response.json())
    .then(data => {
        owner = data.id;
    })
    .catch(err => alert("Failed to get user, the server may be down, or the maximum requests may be exceeded for the hour. Dev details:", err));

    fetch(`${serverURL}/playlists`, {
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
                //double check user still has device active
                fetch(`${serverURL}/devices`, {
                    method: 'GET'
                })
                .then((response) => response.json())
                .then(data => {
                    if (data.devices.length !== 0) {
                        // if true continue
                        showLoader()    

                        fetch(`${serverURL}/shuffle/${owner}/${e.target.id}/${e.target.name}/${deviceId}`, {
                            method: 'GET'
                        })
                        .then((response) => response.json())
                        .then(data => {
                            fetch(`${serverURL}/delete/${data.tempId}`, {
                                method: 'GET',
                            })
                            .catch(err => alert("Failed to delete temp playlist. You will have to manually delete it from your library. Dev details:", err));

                            hideLoader()    
                            alert("Playlist Shuffled Successfully\nIt should be playing in your Spotify now!");
                        })
                        .catch(err => alert("Failed to shuffle, the server may be down, or the maximum requests may be exceeded for the hour. Dev details:", err));
                    }
                    else {
                        // else alert user
                        alert("Error: no device detected.\nPlease open spotify on a device and select it from the drop down menu.\nThe page will now refresh.")
                        location.reload();
                    }
                })
                .catch(err => alert('Failed to get devices, the server may be down, or the maximum requests may be exceeded for the hour. Dev details:', err));
            })
        }
    })
    .catch(err => alert("Failed to get playlists, the server may be down, or the maximum requests may be exceeded for the hour. Dev details:", err));
});

logout.addEventListener('click', () => {
    window.location.href = "index.html";
});

function showLoader() {
    loader.style.display = "block";
}

function hideLoader() {
    loader.style.display = "none";
}