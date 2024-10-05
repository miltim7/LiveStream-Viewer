// src/App.js
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

function App() {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const socketRef = useRef();
  const [isStarted, setIsStarted] = useState(false);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (isStarted) {
      socketRef.current = io('http://localhost:5001');

      socketRef.current.on('connect', () => {
        console.log('Зритель подключился к серверу сигнализации');
        socketRef.current.emit('watcher');
      });

      socketRef.current.on('offer', (id, description) => {
        console.log('Получен offer от стримера:', id);
        peerConnection.current = new RTCPeerConnection(configuration);

        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Зритель отправляет ICE-кандидата стримеру');
            socketRef.current.emit('candidate', id, event.candidate);
          }
        };

        peerConnection.current.ontrack = (event) => {
          console.log('Зритель получил медиапоток от стримера');
          videoRef.current.srcObject = event.streams[0];
          console.log('videoRef.current.srcObject:', videoRef.current.srcObject);
        };

        peerConnection.current.oniceconnectionstatechange = () => {
          console.log('ICE Connection State:', peerConnection.current.iceConnectionState);
        };

        peerConnection.current
          .setRemoteDescription(description)
          .then(() => peerConnection.current.createAnswer())
          .then((sdp) => peerConnection.current.setLocalDescription(sdp))
          .then(() => {
            console.log('Зритель отправляет answer стримеру');
            socketRef.current.emit('answer', id, peerConnection.current.localDescription);
          })
          .catch((error) => console.error('Ошибка при обработке offer:', error));
      });

      socketRef.current.on('candidate', (id, candidate) => {
        console.log('Зритель получил ICE-кандидата от стримера');
        peerConnection.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((e) => console.error('Ошибка при добавлении ICE-кандидата:', e));
      });

      socketRef.current.on('broadcaster', () => {
        console.log('Зритель получил уведомление о новом стримере');
        socketRef.current.emit('watcher');
      });

      socketRef.current.on('disconnectPeer', () => {
        console.log('Зритель получил уведомление об отключении стримера');
        if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
        }
      });

      return () => {
        if (peerConnection.current) {
          peerConnection.current.close();
        }
        socketRef.current.disconnect();
      };
    }
  }, [isStarted]);

  const startWatching = () => {
    setIsStarted(true);
  };

  return (
    <div>
      <h1>Зритель</h1>
      {!isStarted && (
        <button onClick={startWatching}>Начать просмотр</button>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls
        style={{ width: '640px', height: '480px', backgroundColor: 'black' }}
      ></video>
    </div>
  );
}

export default App;
