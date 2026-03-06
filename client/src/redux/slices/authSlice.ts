import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { User, LoginCredentials, RegisterData, AuthResponse, PasswordChangeData, ApiResponse } from "../../types/auth";
import authService from "../../services/authService";
import { clearAuthData, getAuthToken, getRememberPreference, getStoredUser, persistAuthData, setStoredUser } from "../../utils/authStorage";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Get initial state from persisted auth storage.
const getInitialState = (): AuthState => {
  const token = getAuthToken();
  const user = getStoredUser<User>();
  return {
    user,
    token: token || null,
    isAuthenticated: Boolean(token),
    loading: false,
    error: null,
  };
};

const initialState: AuthState = getInitialState();

export const login = createAsyncThunk<AuthResponse, LoginCredentials>(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      const { token, refreshToken, user, billing } = response.data;
      const userWithBilling = { ...user, ...(billing ? { billing } : {}) };
      persistAuthData({
        token,
        refreshToken,
        user: userWithBilling,
        remember: getRememberPreference(),
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

export const register = createAsyncThunk<AuthResponse, RegisterData>(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      const { token, refreshToken, user, billing } = response.data;
      const userWithBilling = { ...user, ...(billing ? { billing } : {}) };
      persistAuthData({
        token,
        refreshToken,
        user: userWithBilling,
        remember: true,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Registration failed");
    }
  }
);

const ACADEMIC_SESSION_STORAGE_KEY = 'becms-academic-session';

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      clearAuthData();
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE_KEY);
      return null;
    } catch (error: any) {
      clearAuthData();
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE_KEY);
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  }
);

export const getCurrentUser = createAsyncThunk<ApiResponse<User>>(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to get user");
    }
  }
);

export const updateProfile = createAsyncThunk<ApiResponse<User>, Partial<User>>(
  "auth/updateProfile",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(userData);
      if (response.data) {
        setStoredUser(response.data);
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Profile update failed");
    }
  }
);

export const changePassword = createAsyncThunk<ApiResponse<null>, PasswordChangeData>(
  "auth/changePassword",
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(passwordData);
      clearAuthData();
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE_KEY);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Password change failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      persistAuthData({
        token: action.payload.token,
        user: action.payload.user,
        remember: true,
      });
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      clearAuthData();
      localStorage.removeItem(ACADEMIC_SESSION_STORAGE_KEY);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { user, token, billing } = action.payload.data;
        state.loading = false;
        state.user = {
          ...user,
          ...(billing ? { billing } : {}),
        };
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        const { user, token, billing } = action.payload.data;
        state.loading = false;
        state.user = {
          ...user,
          ...(billing ? { billing } : {}),
        };
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Get current user
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.loading = false;
          state.user = action.payload.data;
          state.isAuthenticated = true;
          state.error = null;
          setStoredUser(action.payload.data);
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.loading = false;
          state.user = action.payload.data;
          state.error = null;
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Change password
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCredentials, clearCredentials, setLoading } = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectBillingSnapshot = (state: { auth: AuthState }) => state.auth.user?.billing ?? null;

export default authSlice.reducer;
