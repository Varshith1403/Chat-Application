import React, { useContext, useEffect, useRef, useState } from 'react';
import './ChatBox.css';
import assets from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from 'react-toastify';
import upload from '../../lib/upload';

const ChatBox = () => {
  const {
    userData,
    messagesId,
    chatUser,
    messages,
    setMessages,
    chatVisible,
    setChatVisible
  } = useContext(AppContext);

  const [input, setInput] = useState('');
  const scrollEnd = useRef();

  const sendMessage = async () => {
    try {
      if (input.trim() && messagesId) {
        // Add new message to messages collection
        await updateDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            text: input,
            createdAt: new Date()
          })
        });

        const userIDs = [chatUser.rId, userData.id];

        for (const id of userIDs) {
          const userChatsRef = doc(db, 'chats', id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data();
            const chatIndex = userChatsData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            );

            if (chatIndex !== -1) {
              userChatsData.chatsData[chatIndex].lastMessage = input;
              userChatsData.chatsData[chatIndex].updatedAt = Date.now();

              if (userChatsData.chatsData[chatIndex].rId === userData.id) {
                userChatsData.chatsData[chatIndex].messageSeen = false;
              }

              await updateDoc(userChatsRef, {
                chatsData: userChatsData.chatsData
              });
            }
          }
        }

        setInput('');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendImage = async (e) => {
    try {
      const fileUrl = await upload(e.target.files[0]);

      if (fileUrl && messagesId) {
        await updateDoc(doc(db, 'messages', messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: new Date()
          })
        });

        const userIDs = [chatUser.rId, userData.id];

        for (const id of userIDs) {
          const userChatsRef = doc(db, 'chats', id);
          const userChatsSnapshot = await getDoc(userChatsRef);

          if (userChatsSnapshot.exists()) {
            const userChatsData = userChatsSnapshot.data();
            const chatIndex = userChatsData.chatsData.findIndex(
              (c) => c.messageId === messagesId
            );

            if (chatIndex !== -1) {
              userChatsData.chatsData[chatIndex].lastMessage = 'Image';
              userChatsData.chatsData[chatIndex].updatedAt = Date.now();

              await updateDoc(userChatsRef, {
                chatsData: userChatsData.chatsData
              });
            }
          }
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const convertTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute} ${period}`;
  };

  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, 'messages', messagesId), (res) => {
        setMessages(res.data().messages.reverse());
      });
      return () => unSub();
    }
  }, [messagesId]);

  return chatUser ? (
    <div className={`chat-box ${chatVisible ? '' : 'hidden'}`}>
      <div className="chat-user">
        <img src={chatUser.userData?.avatar || assets.profile_img} alt="" />
        <p>
          {chatUser.userData?.name || 'User'}{' '}
          {Date.now() - chatUser.userData.lastSeen <= 70000 && (
            <img className="dot" src={assets.green_dot} alt="" />
          )}
        </p>
        <img
          onClick={() => setChatVisible(false)}
          className="arrow"
          src={assets.arrow_icon}
          alt=""
        />
        <img className="help" src={assets.help_icon} alt="" />
      </div>

      <div className="chat-msg">
        <div ref={scrollEnd}></div>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sId === userData.id ? 's-msg' : 'r-msg'}
          >
            {msg.image ? (
              <img className="msg-img" src={msg.image} alt="sent" />
            ) : (
              <p className="msg">{msg.text}</p>
            )}
            <div>
              <img
                src={
                  msg.sId === userData.id
                    ? userData.avatar
                    : chatUser.userData.avatar
                }
                alt=""
              />
              <p>{convertTimestamp(msg.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          onChange={(e) => setInput(e.target.value)}
          value={input}
          type="text"
          placeholder="Send a message"
        />
        <input
          onChange={sendImage}
          type="file"
          id="image"
          accept="image/png, image/jpeg"
          hidden
        />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="gallery" />
        </label>
        <img onClick={sendMessage} src={assets.send_button} alt="send" />
      </div>
    </div>
  ) : (
    <div className={`chat-welcome ${chatVisible ? '' : 'hidden'}`}>
      <img src={assets.logo_icon} alt="" />
      <p>Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatBox;
