'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function ChatPage({ params }) {
  const { id } = params; // Chat ID from the route
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch messages in real-time
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      collection(db, 'chats', id, 'messages'),
      (snapshot) => {
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Auto-scroll to the bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return; // Prevent empty messages

    try {
      const chatRef = collection(db, 'chats', id, 'messages');
      await addDoc(chatRef, {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName,
        timestamp: serverTimestamp(),
      });
      setNewMessage(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Format the message timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.toDate());
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-messages">
          {loading && <p>Loading messages...</p>}
          {!loading && messages.length === 0 && <p>No messages yet.</p>}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.userId === user.uid ? 'message message-own' : 'message message-other'
              }
            >
              <p className="message-text">{message.text}</p>
              <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-bar">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="chat-input"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="send-button" disabled={!newMessage.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}