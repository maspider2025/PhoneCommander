import { useState, useEffect, useRef } from 'react';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      try {
        // Get the current hostname and port from window.location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

        let wsUrl: string;

        if (process.env.NODE_ENV === 'development') {
          // For development on Replit
          wsUrl = `${protocol}//${host}:${port}/ws`;
        } else {
          // For production
          wsUrl = `${protocol}//${window.location.host}/ws`;
        }

        console.log('Connecting to WebSocket:', wsUrl);
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.current.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');

          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);

        // Retry connection after 5 seconds
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}