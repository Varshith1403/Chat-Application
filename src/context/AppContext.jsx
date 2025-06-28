import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { createContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const [userData, setUserData] = useState(null);
  const [chatData, setChatData] = useState([]); // ✅ Default to empty array to avoid crash
  const [messagesId, setMessagesId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const navigate = useNavigate();

  // ✅ Load logged-in user data
  const loadUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) throw new Error("User does not exist");

      const userData = userSnap.data();
      setUserData(userData);

      if (userData.avatar && userData.name) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }

      await updateDoc(userRef, { lastSeen: Date.now() });

      // Keep updating lastSeen every 60s
      setInterval(async () => {
        if (auth.currentUser) {
          await updateDoc(userRef, { lastSeen: Date.now() });
        }
      }, 60000);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Real-time listener for chatData
  useEffect(() => {
    if (!userData?.id) return;

    const chatRef = doc(db, "chats", userData.id);
    const unsubscribe = onSnapshot(chatRef, async (res) => {
      const chatItems = res.data()?.chatsData || [];
      const tempData = [];

      for (const item of chatItems) {
        try {
          const userRef = doc(db, "users", item.rId);
          const userSnap = await getDoc(userRef);
          const otherUserData = userSnap.exists() ? userSnap.data() : null;

          if (otherUserData) {
            tempData.push({
              ...item,
              userData: { ...otherUserData, id: item.rId },
            });
          }
        } catch (err) {
          console.error("Failed to fetch user for chat item:", err);
        }
      }

      // Sort latest chats on top
      tempData.sort((a, b) => b.updatedAt - a.updatedAt);
      setChatData(tempData);
    });

    return () => unsubscribe();
  }, [userData?.id]);

  const value = {
    userData,
    setUserData,
    loadUserData,
    chatData,
    messagesId,
    setMessagesId,
    chatUser,
    setChatUser,
    chatVisible,
    setChatVisible,
    messages,
    setMessages,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
