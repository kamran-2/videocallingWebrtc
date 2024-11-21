const { v4: uuidv4 } = require("uuid");
const express = require("express");
const bodyParser = require("body-parser");
const webrtc = require("wrtc");

const app = express();
let broadcasters = {}; // Map to store broadcasters by ID.
let consumers = {}; // Map to track consumers for each broadcaster.

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Broadcast endpoint
app.post("/broadcast", async ({ body }, res) => {
  const { sdp } = body;
  const broadcasterId = Math.floor(1000 + Math.random() * 9000);; // Unique ID for the broadcaster.
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stunprotocol.org" }],
  });

  peer.ontrack = (e) => {
    broadcasters[broadcasterId] = { peer, stream: e.streams[0] };
    consumers[broadcasterId] = []; // Initialize consumer list for this broadcaster.
  };

  const desc = new webrtc.RTCSessionDescription(sdp);
  await peer.setRemoteDescription(desc);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  res.json({ sdp: peer.localDescription, broadcasterId });
});

// Consumer endpoint
app.post("/consumer", async ({ body }, res) => {
  const { sdp, broadcasterId } = body;
  const broadcaster = broadcasters[broadcasterId];
  if (!broadcaster) {
    return res.status(404).json({ error: "Broadcaster not found" });
  }

  const consumerPeer = new webrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stunprotocol.org" }],
  });

  const desc = new webrtc.RTCSessionDescription(sdp);
  await consumerPeer.setRemoteDescription(desc);

  // Add broadcaster's tracks to consumer's peer connection
  broadcaster.stream
    .getTracks()
    .forEach((track) => consumerPeer.addTrack(track, broadcaster.stream));

  const answer = await consumerPeer.createAnswer();
  await consumerPeer.setLocalDescription(answer);

  // Track the consumer connection
  consumers[broadcasterId].push(consumerPeer);

  res.json({ sdp: consumerPeer.localDescription });
});

// Cleanup endpoint (optional)
app.post("/cleanup", ({ body }, res) => {
  const { broadcasterId } = body;
  if (broadcasters[broadcasterId]) {
    broadcasters[broadcasterId].peer.close();
    delete broadcasters[broadcasterId];
  }
  if (consumers[broadcasterId]) {
    consumers[broadcasterId].forEach((consumerPeer) => consumerPeer.close());
    delete consumers[broadcasterId];
  }
  res.json({ status: "cleaned up" });
});

app.listen(5000, () => console.log("Server started on port 5000"));
