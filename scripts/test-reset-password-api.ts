import path from 'path';

// Define mock variables that we can change dynamically per test case
let mockUser: any = null;
let mockUserError: any = null;
let mockProfile: any = null;
let mockProfileError: any = null;
let mockUpdateError: any = null;
let lastUpdateCall: { userId: string; attributes: any } | null = null;

const mockSupabaseClient = {
  auth: {
    getUser: async () => ({ data: { user: mockUser }, error: mockUserError }),
  },
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (col: string, val: any) => ({
        single: async () => ({ data: mockProfile, error: mockProfileError }),
      }),
    }),
  }),
};

const mockSupabaseJs = {
  createClient: (url: string, key: string) => ({
    auth: {
      admin: {
        updateUserById: async (userId: string, attributes: any) => {
          lastUpdateCall = { userId, attributes };
          return { data: {}, error: mockUpdateError };
        },
      },
    },
  }),
};

const mockNextHeaders = {
  cookies: () => ({
    get: (name: string) => ({ value: 'mock-cookie-value' }),
    set: () => {},
    delete: () => {},
  }),
};

// Comprehensive module mocking function for Windows path/case issues
function mockModule(moduleName: string, exportsObj: any) {
  try {
    const resolved = require.resolve(moduleName);
    const resolvedLower = resolved.toLowerCase();
    
    const paths = [
      resolved,
      resolvedLower,
      resolved.replace(/\.ts$/, ''),
      resolved.replace(/\.js$/, ''),
      resolvedLower.replace(/\.ts$/, ''),
      resolvedLower.replace(/\.js$/, ''),
      // also mock manually constructed lowercased windows path
      resolved.replace('C:', 'c:'),
      resolved.replace('C:', 'c:').toLowerCase(),
    ];
    
    for (const p of paths) {
      require.cache[p] = {
        id: p,
        filename: p,
        loaded: true,
        exports: exportsObj,
      } as any;
    }
  } catch (err: any) {
    console.warn(`Could not resolve/mock ${moduleName}: ${err.message}`);
  }
}

// Pre-register mocks
mockModule('next/headers', mockNextHeaders);
mockModule('../src/lib/supabase/server', mockSupabaseClient);
mockModule('@supabase/supabase-js', mockSupabaseJs);

// Also loop and mock any potential alias variants we might guess
const possibleServerPaths = [
  '../src/lib/supabase/server',
  '../src/lib/supabase/server.ts',
  '../../src/lib/supabase/server',
  '../../src/lib/supabase/server.ts',
  'c:\\users\\edison\\desktop\\lapolla\\src\\lib\\supabase\\server.ts',
  'c:\\users\\edison\\desktop\\lapolla\\src\\lib\\supabase\\server',
  'C:\\Users\\Edison\\Desktop\\LaPolla\\src\\lib\\supabase\\server.ts',
  'C:\\Users\\Edison\\Desktop\\LaPolla\\src\\lib\\supabase\\server',
];
for (const p of possibleServerPaths) {
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: { createClient: () => mockSupabaseClient }
  } as any;
  require.cache[p.toLowerCase()] = {
    id: p.toLowerCase(),
    filename: p.toLowerCase(),
    loaded: true,
    exports: { createClient: () => mockSupabaseClient }
  } as any;
}

// Now import the route handler
import { POST } from '../src/app/api/admin/reset-password/route';

// Helper to construct Request
function createMockRequest(body: any, isRawBody: boolean = false) {
  const bodyStr = isRawBody ? body : JSON.stringify(body);
  return new Request('http://localhost:3000/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  });
}

// Helper to check response status and body
async function checkResponse(response: Response, expectedStatus: number) {
  const status = response.status;
  const body = await response.json();
  return { status, body };
}

async function runTests() {
  console.log('=== STARTING EMPIRICAL API ENDPOINT TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${message ? ': ' + message : ''}`);
      failed++;
    }
  }

  // Set environment variables required by endpoint
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';

  // Test Case 1: Rejects requests without active session (401)
  try {
    mockUser = null;
    mockUserError = new Error('No session');
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 401);
    assert(
      'Case 1: Reject request without active session (401)',
      status === 401 && body.error === 'No autorizado'
    );
  } catch (err: any) {
    assert('Case 1: Reject request without active session (401)', false, err.message);
  }

  // Test Case 2: Rejects requests from non-admin accounts (403)
  try {
    mockUser = { id: 'user-123', email: 'regular@user.com' };
    mockUserError = null;
    mockProfile = { id: 'user-123', email: 'regular@user.com', is_admin: false };
    mockProfileError = null;
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 403);
    assert(
      'Case 2: Reject request from non-admin account (403)',
      status === 403 && body.error === 'No autorizado'
    );
  } catch (err: any) {
    assert('Case 2: Reject request from non-admin account (403)', false, err.message);
  }

  // Test Case 3: Rejects requests with non-admin accounts when profile fetch fails (403)
  try {
    mockUser = { id: 'user-123', email: 'regular@user.com' };
    mockUserError = null;
    mockProfile = null;
    mockProfileError = new Error('Profile not found');
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 403);
    assert(
      'Case 3: Reject request when profile lookup fails (403)',
      status === 403 && body.error === 'No autorizado'
    );
  } catch (err: any) {
    assert('Case 3: Reject request when profile lookup fails (403)', false, err.message);
  }

  // Test Case 4: Validates payload - Invalid request format (400)
  try {
    mockUser = { id: 'admin-123', email: 'ehdiazs@gmail.com' };
    mockUserError = null;
    mockProfile = { id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true };
    mockProfileError = null;
    const req = createMockRequest('not-a-json', true);
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 400);
    assert(
      'Case 4: Reject invalid request body format (400)',
      status === 400 && body.error === 'Formato de solicitud no válido'
    );
  } catch (err: any) {
    assert('Case 4: Reject invalid request body format (400)', false, err.message);
  }

  // Test Case 5: Validates payload - Missing or invalid userId (400)
  try {
    mockUser = { id: 'admin-123', email: 'ehdiazs@gmail.com' };
    mockUserError = null;
    mockProfile = { id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true };
    mockProfileError = null;
    const req = createMockRequest({ newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 400);
    assert(
      'Case 5: Reject missing/invalid userId (400)',
      status === 400 && body.error === 'ID de usuario no válido'
    );
  } catch (err: any) {
    assert('Case 5: Reject missing/invalid userId (400)', false, err.message);
  }

  // Test Case 6: Validates payload - Password too short (400)
  try {
    mockUser = { id: 'admin-123', email: 'ehdiazs@gmail.com' };
    mockUserError = null;
    mockProfile = { id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true };
    mockProfileError = null;
    const req = createMockRequest({ userId: 'target-456', newPassword: '12345' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 400);
    assert(
      'Case 6: Reject password less than 6 characters (400)',
      status === 400 && body.error === 'La contraseña debe tener al menos 6 caracteres'
    );
  } catch (err: any) {
    assert('Case 6: Reject password less than 6 characters (400)', false, err.message);
  }

  // Test Case 7: Valid request correctly interacts with Supabase admin client to reset password (200)
  try {
    mockUser = { id: 'admin-123', email: 'ehdiazs@gmail.com' };
    mockUserError = null;
    mockProfile = { id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true };
    mockProfileError = null;
    mockUpdateError = null;
    lastUpdateCall = null;
    const req = createMockRequest({ userId: 'target-456', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 200);
    assert(
      'Case 7: Reset password with valid request succeeds (200)',
      status === 200 &&
        body.success === true &&
        body.message === 'Contraseña restablecida exitosamente' &&
        lastUpdateCall !== null &&
        lastUpdateCall.userId === 'target-456' &&
        lastUpdateCall.attributes.password === 'new-secure-password'
    );
  } catch (err: any) {
    assert('Case 7: Reset password with valid request succeeds (200)', false, err.message);
  }

  // Test Case 8: Correctly handles Supabase admin client update errors (500)
  try {
    mockUser = { id: 'admin-123', email: 'ehdiazs@gmail.com' };
    mockUserError = null;
    mockProfile = { id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true };
    mockProfileError = null;
    mockUpdateError = new Error('Database update failed');
    lastUpdateCall = null;
    const req = createMockRequest({ userId: 'target-456', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res, 500);
    assert(
      'Case 8: Handles Supabase admin update errors (500)',
      status === 500 && body.error === 'Database update failed'
    );
  } catch (err: any) {
    assert('Case 8: Handles Supabase admin update errors (500)', false, err.message);
  }

  console.log(`\n=== API ENDPOINT TESTS SUMMARY ===`);
  console.log(`Passed: ${passed} / 8`);
  console.log(`Failed: ${failed} / 8`);
  if (failed > 0) {
    console.error('Some tests failed!');
    process.exit(1);
  } else {
    console.log('All API endpoint tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal error during testing:', err);
  process.exit(1);
});
