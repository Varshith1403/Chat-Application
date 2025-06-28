import React, { useContext, useEffect, useState } from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { db, logout } from '../../config/firebase';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const LeftSidebar = () => {
  const {
    chatData,
    userData,
    chatUser,
    setChatUser,
    setMessagesId,
    messagesId,
    chatVisible,
    setChatVisible,
  } = useContext(AppContext);

  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  const inputHandler = async (e) => {
    try {
      const input = e.target.value.trim().toLowerCase();
      if (input) {
        setShowSearch(true);
        const userRef = collection(db, 'users');
        const q = query(userRef, where('username', '==', input));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const foundUser = querySnap.docs[0].data();
          if (foundUser.id !== userData.id) {
            const exists = chatData.some((c) => c.rId === foundUser.id);
            if (!exists) {
              setUser(foundUser);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setShowSearch(false);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addChat = async () => {
    if (!user || user.id === userData.id || isAdding) return;

    setIsAdding(true);

    const messagesRef = collection(db, 'messages');
    const chatsRef = collection(db, 'chats');

    try {
      const newMessageRef = doc(messagesRef);

      await setDoc(newMessageRef, {
        createAt: serverTimestamp(),
        messages: [],
      });

      const chatEntryForThem = {
        messageId: newMessageRef.id,
        lastMessage: '',
        rId: userData.id,
        updatedAt: Date.now(),
        messageSeen: true,
      };

      const chatEntryForMe = {
        messageId: newMessageRef.id,
        lastMessage: '',
        rId: user.id,
        updatedAt: Date.now(),
        messageSeen: true,
      };

      await updateDoc(doc(chatsRef, user.id), {
        chatsData: arrayUnion(chatEntryForThem),
      });

      await updateDoc(doc(chatsRef, userData.id), {
        chatsData: arrayUnion(chatEntryForMe),
      });

      const uSnap = await getDoc(doc(db, 'users', user.id));
      const uData = uSnap.data();

      setChat({
        messageId: newMessageRef.id,
        lastMessage: '',
        rId: user.id,
        updatedAt: Date.now(),
        messageSeen: true,
        userData: uData,
      });

      setShowSearch(false);
      setChatVisible(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const setChat = async (item) => {
    setMessagesId(item.messageId);
    setChatUser(item);
    try {
      const userChatsRef = doc(db, 'chats', userData.id);
      const userChatsSnapshot = await getDoc(userChatsRef);
      const userChatsData = userChatsSnapshot.data();
      const chatIndex = userChatsData.chatsData.findIndex(
        (c) => c.messageId === item.messageId
      );
      if (chatIndex !== -1) {
        userChatsData.chatsData[chatIndex].messageSeen = true;
        await updateDoc(userChatsRef, {
          chatsData: userChatsData.chatsData,
        });
      }
    } catch {}
    setChatVisible(true);
  };

  useEffect(() => {
    const updateChatUserData = async () => {
      if (chatUser?.userData?.id) {
        const userRef = doc(db, 'users', chatUser.userData.id);
        const userSnap = await getDoc(userRef);
        const updatedUserData = userSnap.data();
        if (
          JSON.stringify(updatedUserData) !==
          JSON.stringify(chatUser.userData)
        ) {
          setChatUser((prev) => ({
            ...prev,
            userData: updatedUserData,
          }));
        }
      }
    };
    updateChatUserData();
  }, [chatUser?.userData?.id]);

  const filteredChats = chatData.filter((item) => item.rId !== userData.id);

  return (
    <div className={`ls ${chatVisible ? 'hidden' : ''}`}>
      <div className="ls-top">
        <div className="ls-nav">
          <img className="logo" src={assets.logo} alt="Logo" />
          <div className="menu">
            <img src={assets.menu_icon} alt="Menu" />
            <div className="sub-menu">
              <p onClick={() => navigate('/profile')}>Edit Profile</p>
              <hr />
              <p onClick={() => logout()}>Logout</p>
            </div>
          </div>
        </div>
        <div className="ls-search">
          <img src={assets.search_icon} alt="Search" />
          <input
            onChange={inputHandler}
            type="text"
            placeholder="Search here..."
          />
        </div>
      </div>
      <div className="ls-list">
        {showSearch && user ? (
          <div
            onClick={addChat}
            className={`friends add-user ${isAdding ? 'disabled' : ''}`}
          >
            <img src={user.avatar || assets.profile_img} alt="user" />
            <p>{user.name}</p>
          </div>
        ) : (
          filteredChats.map((item, index) => (
            <div
              onClick={() => setChat(item)}
              key={index}
              className={`friends ${
                item.messageSeen || item.messageId === messagesId ? '' : 'border'
              }`}
            >
              <img
                src={item.userData?.avatar || assets.profile_img}
                alt="friend"
              />
              <div>
                <p>{item.userData?.name || 'Unknown'}</p>
                <span>{item.lastMessage?.slice(0, 30) || ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
