import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const url = 'https://mcp.supabase.com/mcp';
const projectId = 'eidfwvezvzpvcgqnijhm';

async function run() {
  const query = process.argv[2] || 'SELECT version();';
  console.log(`Running query: ${query}`);

  try {
    const initRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'agent-client',
            version: '1.0.0'
          }
        },
        id: 1
      })
    });

    const sessionId = initRes.headers.get('Mcp-Session-Id');
    if (!sessionId) {
      throw new Error('No Mcp-Session-Id returned');
    }

    const execRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`,
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_sql',
          arguments: {
            project_id: projectId,
            query: query
          }
        },
        id: 2
      })
    });

    const body = await execRes.json();
    console.log('Result:', JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
