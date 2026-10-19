import Peer from 'peerjs';

// Online co-op for two players with a share link. The host runs the whole game;
// the friend (guest) watches the host's picture as a live video, sees a small
// HUD and sends back his controls. Messages are plain objects.
export const hooks = { banner: null, say: null }; // the host mirrors banners and dialogue to the guest

// How the two players find a path to each other. STUN finds a direct path; TURN is a relay
// used when a direct path is blocked (mobile data, strict routers).
// (A TURN relay would need short-lived credentials from a server, so none is used here.)
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const peerOptions = () => ({ config: { iceServers: ICE_SERVERS } });

let peer = null;
let conn = null;

export const isConnected = () => !!conn && conn.open;

export function send(message) {
  if (conn && conn.open) conn.send(message);
}

export function closeNet() {
  try {
    conn?.close();
    peer?.destroy();
  } catch {
    // already closed
  }
  conn = null;
  peer = null;
}

// Host: returns the link to share. onJoin / onLeave tell when the friend comes and goes.
export function hostGame({ onJoin, onData, onLeave }) {
  closeNet();
  return new Promise((resolve, reject) => {
    peer = new Peer(peerOptions());
    peer.on('open', (id) => resolve(`${location.origin}${location.pathname}?join=${id}`));
    peer.on('error', (e) => {
      console.warn('[net] host error', e.type || e);
      reject(e);
    });
    peer.on('connection', (c) => {
      if (conn && conn.open) {
        c.close(); // only one friend
        return;
      }
      conn = c;
      c.on('open', onJoin);
      c.on('data', onData);
      c.on('close', () => {
        if (conn === c) conn = null;
        onLeave();
      });
    });
  });
}

// Host: sends the game picture (and sound) to the friend.
export function streamTo(stream) {
  if (peer && conn) peer.call(conn.peer, stream);
}

// Guest: connects to the host with the id from the link.
export function joinGame(hostId, { onOpen, onVideo, onData, onClose, onError }) {
  closeNet();
  peer = new Peer(peerOptions());
  peer.on('error', onError);
  peer.on('call', (call) => {
    call.answer();
    call.on('stream', onVideo);
  });
  peer.on('open', () => {
    conn = peer.connect(hostId);
    conn.on('open', onOpen);
    conn.on('data', onData);
    conn.on('close', onClose);
  });
}
