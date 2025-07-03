
import React from 'react';

export default function AgentCard({ agent, onClick }) {
  return (
    <div onClick={onClick} className="rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg">
      <div className="w-24 h-24 bg-cover bg-center rounded-full mx-auto mb-4"
        style={{ backgroundImage: \`url(\${agent.image})\` }}></div>
      <h3 className="text-xl font-bold text-center text-gray-800">{agent.name}</h3>
      <p className="text-sm text-center text-gray-500">{agent.role}</p>
    </div>
  );
}
