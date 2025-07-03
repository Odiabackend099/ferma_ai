
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function VoiceInterface() {
  const [searchParams] = useSearchParams();
  const wsURL = searchParams.get('ws');
  const conversationId = searchParams.get('cid');
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    if (!wsURL || !conversationId) return;

    ws.current = new WebSocket(wsURL);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => ws.current.close();
  }, [wsURL, conversationId]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Live Voice Chat</h2>
      <div className="bg-gray-100 p-4 rounded-md h-96 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-2 text-sm text-gray-700">
            <strong>{msg.sender || 'System'}:</strong> {msg.text || JSON.stringify(msg)}
          </div>
        ))}
      </div>
    </div>
  );
}
