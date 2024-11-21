window.onload = () => {
  document.getElementById("my-button").onclick = () => {
    init();
  };

  document.getElementById("send-chat").onclick = () => {
    const message = document.getElementById("chat-input").value;
    socket.emit("send-message", {
      broadcasterId,
      username: "Broadcaster",
      message,
    });
    addMessageToChat(`You: ${message}`);
  };
};

async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  document.getElementById("video").srcObject = stream;

  const peer = createPeer();
  stream.getTracks().forEach((track) => peer.addTrack(track, stream));
}

function createPeer() {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stunprotocol.org" }],
  });
  peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

  return peer;
}

async function handleNegotiationNeededEvent(peer) {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  const payload = { sdp: peer.localDescription };

  const { data } = await axios.post("/broadcast", payload);
  const desc = new RTCSessionDescription(data.sdp);
  peer.setRemoteDescription(desc).catch((e) => console.error(e));

  // Display the broadcaster ID for viewers
  alert(`Your Broadcaster ID: ${data.broadcasterId}`);
}
