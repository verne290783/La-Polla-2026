import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const url = 'https://mcp.supabase.com/mcp';
const projectId = 'eidfwvezvzpvcgqnijhm';

async function run() {
  const query = "SELECT routine_definition FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'compute_points';";
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
          clientInfo: { name: 'agent-client', version: '1.0.0' }
        },
        id: 1
      })
    });

    const sessionId = initRes.headers.get('Mcp-Session-Id');
    if (!sessionId) throw new Error('No Mcp-Session-Id');

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
          arguments: { project_id: projectId, query }
        },
        id: 2
      })
    });

    const body = await execRes.json();
    fs.writeFileSync('mcp_response.json', JSON.stringify(body, null, 2));
    const definition = body.result?.result?.[0]?.routine_definition;
    if (definition) {
      fs.writeFileSync('db_compute_points_definition.sql', definition);
      console.log('Definition saved to db_compute_points_definition.sql');
      
      // Print lines matching updated_at or lock_time_part2
      const lines = definition.split('\n');
      console.log('--- Lines containing updated_at or lock_time ---');
      lines.forEach((line: string, idx: number) => {
        if (line.includes('updated_at') || line.includes('lock_time') || line.includes('points_earned')) {
          console.log(`${idx + 1}: ${line}`);
        }
      });
    } else {
      console.log('compute_points definition not found or response structure different:', JSON.stringify(body, null, 2));
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
