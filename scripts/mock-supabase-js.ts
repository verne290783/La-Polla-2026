let mockUpdateError: any = null;
let lastUpdateCall: { userId: string; attributes: any } | null = null;

export const mockAdminState = {
  setMockUpdateError: (err: any) => { mockUpdateError = err; },
  getLastUpdateCall: () => lastUpdateCall,
  clearLastUpdateCall: () => { lastUpdateCall = null; },
};

// --- Mock matches table state ---
let mockDbMatches: any[] = [];
let mockDbUpdateError: any = null;
const updateCalls: { id: number; payload: any }[] = [];

export const mockDbState = {
  setMatches: (matches: any[]) => { mockDbMatches = matches; },
  setUpdateError: (err: any) => { mockDbUpdateError = err; },
  getUpdateCalls: () => updateCalls,
  clear: () => {
    mockDbMatches = [];
    mockDbUpdateError = null;
    updateCalls.length = 0;
  }
};

export function createClient(url: string, key: string) {
  return {
    auth: {
      admin: {
        updateUserById: async (userId: string, attributes: any) => {
          lastUpdateCall = { userId, attributes };
          return { data: {}, error: mockUpdateError };
        },
      },
    },
    from: (table: string) => {
      if (table !== 'matches') {
        throw new Error(`Mock only supports 'matches' table, got '${table}'`);
      }
      return {
        select: (query: string) => {
          if (query !== '*') {
            throw new Error(`Mock select only supports '*', got '${query}'`);
          }
          return Promise.resolve({ data: mockDbMatches, error: null });
        },
        update: (payload: any) => {
          return {
            eq: async (field: string, val: any) => {
              if (field !== 'id') {
                throw new Error(`Mock update eq only supports 'id', got '${field}'`);
              }
              if (mockDbUpdateError) {
                return Promise.resolve({ error: mockDbUpdateError });
              }
              // Record update
              updateCalls.push({ id: Number(val), payload });
              // Update mock local DB representation
              const match = mockDbMatches.find(m => m.id === Number(val));
              if (match) {
                Object.assign(match, payload);
              }
              return Promise.resolve({ error: null });
            }
          };
        }
      };
    }
  } as any;
}

