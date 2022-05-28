let APP_ID = 'f6cca955f21c4db9acd42ecbe3e41001';
let uid = String(Math.floor(Math.random() * 10000));
let token;

let client;
let channel;

let localStream;
let remoteStream;
let audioStatus = false;
let constraints = {
  audio: true,
  video: {
    width: { min: 1280, ideal: 1280, max: 1920 },
    height: { min: 720, ideal: 720, max: 1080 },
  },
};
const userOne = document.querySelector('#user-1');
const userTwo = document.querySelector('#user-2');
const cameraBtn = document.querySelector('#camera-btn');
console.log(cameraBtn);
const micBtn = document.querySelector('#mic-btn');
const leaveBtn = document.querySelector('#leave-btn');

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomId = urlParams.get('room');

if (!roomId) {
  window.location = 'lobby.html';
}

let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};

const init = async () => {
  try {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });
    channel = client.createChannel(roomId);
    await channel.join();

    channel.on('MemberJoined', handleUserJoined);
    channel.on('MemberLeft', handleUserLeave);
    client.on('MessageFromPeer', handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream
      .getTracks()
      .find(track => track.kind === 'audio').enabled = false;
    userOne.srcObject = localStream;
  } catch (err) {
    console.log(err);
  }
};

const handleUserLeave = async MemberUid => {
  try {
    userTwo.style.display = 'none';
    userOne.classList.add('smallFrame');
  } catch (err) {
    console.log(err);
  }
};

const handleMessageFromPeer = async (message, MemberUid) => {
  try {
    message = await JSON.parse(message.text);
    // console.log(`Message from ${MemberUid}`, message);
    if (message.type === 'offer') {
      createAnswer(MemberUid, message.offer);
    }
    if (message.type === 'answer') {
      addAnswer(message.answer);
    }
    if (message.type === 'candidate') {
      if (peerConnection) {
        peerConnection.addIceCandidate(message.candidate);
      }
    }
  } catch (err) {
    console.log(err);
    h;
  }
};

const createPeerConnection = async MemberUid => {
  try {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();

    userTwo.srcObject = remoteStream;
    userTwo.style.display = 'block';

    userOne.classList.add('smallFrame');
    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream
        .getTracks()
        .find(track => track.kind === 'audio').enabled = false;
      userOne.srcObject = localStream;
    }

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
    };

    peerConnection.onicecandidate = async function (event) {
      if (event.candidate) {
        client.sendMessageToPeer(
          {
            text: JSON.stringify({
              type: 'candidate',
              candidate: event.candidate,
            }),
          },
          MemberUid,
        );
      }
    };
  } catch (err) {
    console.log(err);
  }
};
const createOffer = async MemberUid => {
  try {
    await createPeerConnection(MemberUid);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer(
      {
        text: JSON.stringify({
          type: 'offer',
          offer: offer,
        }),
      },
      MemberUid,
    );
  } catch (err) {
    console.log(err);
  }
};
const handleUserJoined = async MemberUid => {
  try {
    console.log('New User has joined', MemberUid);
    createOffer(MemberUid);
  } catch (err) {
    console.log(err);
  }
};

const createAnswer = async (MemberUid, offer) => {
  try {
    await createPeerConnection(MemberUid);
    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer(
      {
        text: JSON.stringify({
          type: 'answer',
          answer: answer,
        }),
      },
      MemberUid,
    );
  } catch (err) {
    console.log(err);
  }
};

const addAnswer = async answer => {
  try {
    if (!peerConnection.currentRemoteDescription) {
      peerConnection.setRemoteDescription(answer);
    }
  } catch (err) {
    console.log(err);
  }
};

const leaveChannel = async () => {
  try {
    await channel.leave();
    await client.logout();
  } catch (err) {
    console.log(err);
  }
};

const toggleCamera = async () => {
  try {
    const videoTrack = localStream
      .getTracks()
      .find(track => track.kind === 'video');

    if (videoTrack.enabled) {
      videoTrack.enabled = false;
      cameraBtn.style.backgroundColor = 'rgb(255,80,80)';
    } else {
      videoTrack.enabled = true;
      cameraBtn.style.backgroundColor = 'rgb(179,102,249, .9)';
    }
  } catch (err) {
    console.log(err);
  }
};
const toggleMic = async () => {
  try {
    let audioTrack = localStream
      .getTracks()
      .find(track => track.kind === 'audio');

    if (audioTrack.enabled) {
      audioTrack.enabled = false;
      micBtn.style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
      audioTrack.enabled = true;
      micBtn.style.backgroundColor = 'rgb(179, 102, 249, .9)';
    }
  } catch (err) {
    console.log(err);
  }
};
cameraBtn.addEventListener('click', e => toggleCamera(e));
micBtn.addEventListener('click', e => toggleMic(e));

window.addEventListener('beforeunload', leaveChannel);

init();
