import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [html, setHtml] = useState("");
  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast("Socket connection failed, try again later.", {
          icon: "❌",
        });
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast(`${username} joined the room.`, {
              icon: "🤝",
            });
            console.log(`${username} joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast(`${username} left the room.`, {
          icon: "☹",
        });
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
    };
    init();
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast("Room ID has been copied to your Clipboard !", {
        icon: "📋",
      });
    } catch (err) {
      toast("Could not copy the Room ID", {
        icon: "📋",
      });
      console.error(err);
    }
  }

  function vInput(){

  }
  
  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <button className="vin" onClick={vInput}>
          {"🎙"}
        </button>
      <div className="aside">
        <img src="/code-sync.png" alt="logo" />
        
        <div className="asideInner">
          <h3>Members</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button id="copy" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button id="leave" onClick={leaveRoom}>
          Leave ROOM
        </button>
      </div>
      <div className="editorWrap">
        <iframe srcDoc={html} />
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
            setHtml(codeRef.current);
          }}
        />
      </div>
    </div>
  );
};

export default EditorPage;
