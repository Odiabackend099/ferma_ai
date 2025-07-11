import React, { useState } from 'react';

const AgentFERMAI = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I am Agent FERMA AI, your 24/7 road maintenance assistant powered by ODIA AI LTD. How can I help you today? 🇳🇬',
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Thank you for contacting FERMA. Your message "${inputMessage}" has been received and logged. For emergencies, call 0800-FERMA-01. SMS: Text EMERGENCY to 32100. Email: emergency@ferma.gov.ng`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);

    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden">
              <div className="w-full h-full bg-yellow-400 rounded-full flex items-center justify-center relative border-2 border-yellow-600">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center relative">
                  <div className="w-4 h-1 bg-white rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-800 bg-yellow-400 px-1">
                  FERMA
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">Agent FERMA AI</h1>
              <p className="text-green-100 text-sm">Federal Roads Maintenance Agency • Powered by ODIA AI LTD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="p-4 bg-white border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="bg-red-500 text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 text-sm">
            <div className="font-medium">Emergency Report</div>
          </button>
          <button className="bg-orange-500 text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 text-sm">
            <div className="font-medium">Report Pothole</div>
          </button>
          <button className="bg-blue-500 text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 text-sm">
            <div className="font-medium">Check Status</div>
          </button>
          <button className="bg-green-500 text-white p-4 rounded-xl hover:scale-105 transition-all duration-200 text-sm">
            <div className="font-medium">Contact Engineer</div>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md p-3 rounded-xl shadow-sm ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white border border-gray-200'
            }`}>
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-300 transition-colors"
          >
            Send
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 text-center">
          🚀 Powered by ODIA AI LTD • Claude AI • Production System • Session Active
        </div>
      </div>
    </div>
  );
};

export default AgentFERMAI;