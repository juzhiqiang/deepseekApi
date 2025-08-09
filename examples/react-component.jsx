// Example: Using the DeepSeek GraphQL API with React
import React, { useState } from 'react';

const API_ENDPOINT = 'https://your-worker.your-subdomain.workers.dev';

export const DeepSeekChat = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('deepseek-chat');

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const result = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation($input: ChatInput!) {
              chat(input: $input) {
                choices {
                  message {
                    content
                  }
                }
                usage {
                  total_tokens
                }
              }
            }
          `,
          variables: {
            input: {
              model,
              messages: [{ role: 'user', content: message }],
              max_tokens: 200,
              temperature: 0.7
            }
          }
        })
      });

      const data = await result.json();
      
      if (data.errors) {
        setResponse(`Error: ${data.errors[0].message}`);
      } else {
        setResponse(data.data.chat.choices[0].message.content);
      }
    } catch (error) {
      setResponse(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h2>DeepSeek Chat</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          Model: 
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            style={{ marginLeft: '10px' }}
          >
            <option value="deepseek-chat">deepseek-chat</option>
            <option value="deepseek-coder">deepseek-coder</option>
            <option value="deepseek-math">deepseek-math</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          style={{
            width: '100%',
            height: '100px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      <button
        onClick={sendMessage}
        disabled={loading || !message.trim()}
        style={{
          background: loading ? '#ccc' : '#007cba',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>

      {response && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>Response:</strong><br />
          {response}
        </div>
      )}
    </div>
  );
};

export default DeepSeekChat;