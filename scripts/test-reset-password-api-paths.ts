import { mockState } from './mock-supabase-server';
import { mockAdminState } from './mock-supabase-js';
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
async function checkResponse(response: Response) {
  const status = response.status;
  const body = await response.json();
  return { status, body };
}

async function runTests() {
  console.log('=== STARTING EMPIRICAL API ENDPOINT PATHS TESTS ===\n');
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
    mockState.setMockUser(null);
    mockState.setMockUserError(new Error('No session'));
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 1: Reject request without active session (401)',
      status === 401 && body.error === 'No autorizado',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 1: Reject request without active session (401)', false, err.message);
  }

  // Test Case 2: Rejects requests from non-admin accounts (403)
  try {
    mockState.setMockUser({ id: 'user-123', email: 'regular@user.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'user-123', email: 'regular@user.com', is_admin: false });
    mockState.setMockProfileError(null);
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 2: Reject request from non-admin account (403)',
      status === 403 && body.error === 'No autorizado',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 2: Reject request from non-admin account (403)', false, err.message);
  }

  // Test Case 3: Rejects requests with non-admin accounts when profile fetch fails (403)
  try {
    mockState.setMockUser({ id: 'user-123', email: 'regular@user.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile(null);
    mockState.setMockProfileError(new Error('Profile not found'));
    const req = createMockRequest({ userId: '123', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 3: Reject request when profile lookup fails (403)',
      status === 403 && body.error === 'No autorizado',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 3: Reject request when profile lookup fails (403)', false, err.message);
  }

  // Test Case 4: Validates payload - Invalid request format (400)
  try {
    mockState.setMockUser({ id: 'admin-123', email: 'ehdiazs@gmail.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true });
    mockState.setMockProfileError(null);
    const req = createMockRequest('not-a-json', true);
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 4: Reject invalid request body format (400)',
      status === 400 && body.error === 'Formato de solicitud no válido',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 4: Reject invalid request body format (400)', false, err.message);
  }

  // Test Case 5: Validates payload - Missing or invalid userId (400)
  try {
    mockState.setMockUser({ id: 'admin-123', email: 'ehdiazs@gmail.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true });
    mockState.setMockProfileError(null);
    const req = createMockRequest({ newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 5: Reject missing/invalid userId (400)',
      status === 400 && body.error === 'ID de usuario no válido',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 5: Reject missing/invalid userId (400)', false, err.message);
  }

  // Test Case 6: Validates payload - Password too short (400)
  try {
    mockState.setMockUser({ id: 'admin-123', email: 'ehdiazs@gmail.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true });
    mockState.setMockProfileError(null);
    const req = createMockRequest({ userId: 'target-456', newPassword: '12345' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 6: Reject password less than 6 characters (400)',
      status === 400 && body.error === 'La contraseña debe tener al menos 6 caracteres',
      `Got status ${status}, error ${body.error}`
    );
  } catch (err: any) {
    assert('Case 6: Reject password less than 6 characters (400)', false, err.message);
  }

  // Test Case 7: Valid request correctly interacts with Supabase admin client to reset password (200)
  try {
    mockState.setMockUser({ id: 'admin-123', email: 'ehdiazs@gmail.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true });
    mockState.setMockProfileError(null);
    mockAdminState.setMockUpdateError(null);
    mockAdminState.clearLastUpdateCall();
    const req = createMockRequest({ userId: 'target-456', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    const lastUpdateCall = mockAdminState.getLastUpdateCall();
    assert(
      'Case 7: Reset password with valid request succeeds (200)',
      status === 200 &&
        body.success === true &&
        body.message === 'Contraseña restablecida exitosamente' &&
        lastUpdateCall !== null &&
        lastUpdateCall.userId === 'target-456' &&
        lastUpdateCall.attributes.password === 'new-secure-password',
      `Got status ${status}, body ${JSON.stringify(body)}, lastUpdateCall ${JSON.stringify(lastUpdateCall)}`
    );
  } catch (err: any) {
    assert('Case 7: Reset password with valid request succeeds (200)', false, err.message);
  }

  // Test Case 8: Correctly handles Supabase admin client update errors (500)
  try {
    mockState.setMockUser({ id: 'admin-123', email: 'ehdiazs@gmail.com' });
    mockState.setMockUserError(null);
    mockState.setMockProfile({ id: 'admin-123', email: 'ehdiazs@gmail.com', is_admin: true });
    mockState.setMockProfileError(null);
    mockAdminState.setMockUpdateError(new Error('Database update failed'));
    mockAdminState.clearLastUpdateCall();
    const req = createMockRequest({ userId: 'target-456', newPassword: 'new-secure-password' });
    const res = await POST(req);
    const { status, body } = await checkResponse(res);
    assert(
      'Case 8: Handles Supabase admin update errors (500)',
      status === 500 && body.error === 'Database update failed',
      `Got status ${status}, error ${body.error}`
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
