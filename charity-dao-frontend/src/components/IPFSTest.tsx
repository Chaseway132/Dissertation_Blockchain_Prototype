import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { testIPFSConnection, uploadVoteToIPFS, uploadExecutionToIPFS } from '../utils/ipfs';
import axios from 'axios';

// Get JWT from environment
const JWT = process.env.REACT_APP_PINATA_JWT || '';

const IPFSTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<string>("Checking...");
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Check JWT on mount
  useEffect(() => {
    if (JWT) {
      setJwtStatus(`JWT is present (length: ${JWT.length})`);
    } else {
      setJwtStatus("JWT is missing!");
    }
  }, []);
  
  // Manual JWT check - more detailed
  const checkJwt = () => {
    setIsLoading(true);
    setStatus('Checking JWT...');
    
    try {
      console.log('JWT variable type:', typeof JWT);
      console.log('JWT value exists:', !!JWT);
      
      if (JWT) {
        console.log('JWT length:', JWT.length);
        console.log('JWT first 20 chars:', JWT.substring(0, 20) + '...');
        console.log('JWT last 20 chars:', '...' + JWT.substring(JWT.length - 20));
        
        setStatus(`✅ JWT found: Length ${JWT.length}, starts with ${JWT.substring(0, 10)}...`);
        setDebugInfo({
          type: 'jwt',
          length: JWT.length,
          firstChars: JWT.substring(0, 20),
          environment: process.env.NODE_ENV
        });
      } else {
        setStatus('❌ JWT not found in environment variables');
        setDebugInfo({
          type: 'jwt-missing',
          environment: process.env.NODE_ENV,
          envVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
        });
      }
    } catch (error) {
      console.error('JWT check error:', error);
      setStatus(`❌ Error checking JWT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsLoading(true);
      setStatus('Testing connection to IPFS...');
      setDebugInfo(null);
      
      console.log('Testing IPFS connection...');
      const isConnected = await testIPFSConnection();
      
      console.log('IPFS connection test result:', isConnected);
      
      if (isConnected) {
        setStatus('✅ Successfully connected to IPFS (Pinata)');
        toast.success('Successfully connected to IPFS (Pinata)');
      } else {
        setStatus('❌ Failed to connect to IPFS (Pinata)');
        toast.error('Failed to connect to IPFS (Pinata)');
      }
    } catch (error) {
      console.error('IPFS connection test failed:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to test IPFS connection');
      setDebugInfo(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManualTest = async () => {
    try {
      setIsLoading(true);
      setStatus('Testing direct connection to Pinata...');
      setDebugInfo(null);
      
      if (!JWT) {
        setStatus('❌ JWT not found');
        return;
      }
      
      try {
        // Test with a simple API endpoint
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'Authorization': `Bearer ${JWT}`
          }
        });
        
        console.log('Direct Pinata test response:', response.data);
        setStatus(`✅ Authentication successful! Response: ${JSON.stringify(response.data)}`);
        setDebugInfo(response.data);
        toast.success('Successfully authenticated with Pinata');
      } catch (error: any) {
        console.error('Direct Pinata test failed:', error);
        setStatus(`❌ Direct API call failed: ${error.message}`);
        setDebugInfo({
          error: error.message,
          response: error.response?.data || 'No response data',
          status: error.response?.status || 'Unknown status'
        });
        toast.error('Direct connection to Pinata failed');
      }
    } catch (error) {
      console.error('Manual test error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestUpload = async () => {
    try {
      setIsLoading(true);
      setStatus('Testing upload to IPFS...');
      setDebugInfo(null);
      
      // Create a mock vote metadata
      const mockVoteData = {
        proposalId: "1",
        description: "Test vote",
        timestamp: new Date().toISOString()
      };
      
      console.log('Uploading test data to IPFS...');
      const hash = await uploadVoteToIPFS(
        "1",
        "0x1234567890123456789012345678901234567890",
        new Date().toISOString(),
        JSON.stringify(mockVoteData)
      );
      
      console.log('IPFS upload result:', hash);
      
      if (hash) {
        setStatus(`✅ Successfully uploaded to IPFS: ${hash}`);
        toast.success('Successfully uploaded to IPFS');
        setDebugInfo({ hash, url: `https://gateway.pinata.cloud/ipfs/${hash}` });
      } else {
        setStatus('❌ Failed to upload to IPFS');
        toast.error('Failed to upload to IPFS');
      }
    } catch (error) {
      console.error('IPFS upload test failed:', error);
      setStatus(`❌ Upload Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to upload to IPFS');
      setDebugInfo(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded shadow-sm p-4">
      <h2 className="text-xl font-bold mb-4">IPFS Integration Test</h2>
      
      <div className="mb-4">
        <p className="text-sm mb-2">Environment: {process.env.NODE_ENV}</p>
        <p className="text-sm mb-4">JWT Status: <span className={jwtStatus.includes("missing") ? "text-red-600 font-bold" : "text-green-600"}>{jwtStatus}</span></p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={checkJwt}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading && status?.includes('JWT') ? 'Checking...' : 'Check JWT'}
          </button>
          
          <button 
            onClick={handleTestConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading && status?.includes('connection') ? 'Testing Connection...' : 'Test Connection'}
          </button>
          
          <button 
            onClick={handleManualTest}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading && status?.includes('direct') ? 'Testing...' : 'Direct API Test'}
          </button>
          
          <button 
            onClick={handleTestUpload}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading && status?.includes('upload') ? 'Uploading...' : 'Test Upload'}
          </button>
        </div>
      </div>
      
      {status && (
        <div className={`p-3 rounded ${status.includes('✅') ? 'bg-green-100' : 'bg-red-100'}`}>
          {status}
        </div>
      )}
      
      {debugInfo && (
        <div className="mt-4 bg-gray-100 p-3 rounded">
          <h3 className="text-sm font-medium">Debug Information:</h3>
          <pre className="text-xs mt-2 overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default IPFSTest;
