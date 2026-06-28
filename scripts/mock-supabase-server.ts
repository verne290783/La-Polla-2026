let mockUser: any = null;
let mockUserError: any = null;
let mockProfile: any = null;
let mockProfileError: any = null;

export const mockState = {
  setMockUser: (user: any) => { mockUser = user; },
  setMockUserError: (err: any) => { mockUserError = err; },
  setMockProfile: (profile: any) => { mockProfile = profile; },
  setMockProfileError: (err: any) => { mockProfileError = err; },
};

export function createClient() {
  return {
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
  } as any;
}
