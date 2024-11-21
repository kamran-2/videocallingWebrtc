window.onload = () => {
  document.getElementById("my-button").onclick = () => {
    init();
  };
};

async function init() {
  const broadcasterId = prompt("Enter the broadcaster ID to join:");
  const peer = createPeer(broadcasterId);
  peer.addTransceiver("video", { direction: "recvonly" });
}

function createPeer(broadcasterId) {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stunprotocol.org" }],
  });
  peer.ontrack = handleTrackEvent;
  peer.onnegotiationneeded = () =>
    handleNegotiationNeededEvent(peer, broadcasterId);

  return peer;
}

async function handleNegotiationNeededEvent(peer, broadcasterId) {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  const payload = { sdp: peer.localDescription, broadcasterId };

  const { data } = await axios.post("/consumer", payload);
  const desc = new RTCSessionDescription(data.sdp);
  peer.setRemoteDescription(desc).catch((e) => console.error(e));
}

function handleTrackEvent(e) {
  document.getElementById("video").srcObject = e.streams[0];
}
