import { AuthService } from '../AuthService';
import { EmailService } from '../EmailService';
import { initializeDatabase, closeDatabase } from '../../database';

// Mock EmailService to avoid sending real emails during tests
jest.mock('../EmailService');
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(async () => {
    // Use in-memory database for testing
    process.env.DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret-key';
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    authService = new AuthService();
    jest.clearAllMocks();
    
    // Clear users table before each test
    const { database } = await import('../../database');
    await database.run('DELETE FROM users');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();

      const user = await authService.register(email, password);

      expect(user.email).toBe(email);
      expect(user.emailVerified).toBe(false);
      expect(user.verificationToken).toBeDefined();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(user);
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.register('invalid-email', 'testpassword123')
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error for short password', async () => {
      await expect(
        authService.register('test@example.com', '123')
      ).rejects.toThrow('Password must be between 8 and 128 characters');
    });

    it('should throw error for duplicate email', async () => {
      const email = 'duplicate@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();

      // Register first user
      await authService.register(email, password);

      // Try to register with same email
      await expect(
        authService.register(email, password)
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create and verify a test user
      const email = 'login-test@example.com';
      const password = 'testpassword123';
      
      mockEmailService.sendVerificationEmail.mockResolvedValue();
      const user = await authService.register(email, password);
      
      // Verify the user's email
      if (user.verificationToken) {
        await authService.verifyEmail(user.verificationToken);
      }
    });

    it('should login successfully with valid credentials', async () => {
      const email = 'login-test@example.com';
      const password = 'testpassword123';

      const result = await authService.login(email, password);

      expect(result.user.email).toBe(email);
      expect(result.user.emailVerified).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'testpassword123')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      await expect(
        authService.login('login-test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for unverified email', async () => {
      const email = 'unverified@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();
      await authService.register(email, password);

      await expect(
        authService.login(email, password)
      ).rejects.toThrow('Please verify your email before logging in');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const email = 'verify-test@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();
      const user = await authService.register(email, password);

      const success = await authService.verifyEmail(user.verificationToken!);

      expect(success).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      await expect(
        authService.verifyEmail('invalid-token')
      ).rejects.toThrow('Invalid or expired verification token');
    });

    it('should throw error when trying to use token again after verification', async () => {
      const email = 'already-verified@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();
      const user = await authService.register(email, password);
      
      // Verify once
      await authService.verifyEmail(user.verificationToken!);
      
      // Try to verify again with same token - should fail as token is now invalid
      await expect(
        authService.verifyEmail(user.verificationToken!)
      ).rejects.toThrow('Invalid or expired verification token');
    });
  });

  describe('verifyJWT', () => {
    it('should verify valid JWT token', async () => {
      const email = 'jwt-test@example.com';
      const password = 'testpassword123';

      mockEmailService.sendVerificationEmail.mockResolvedValue();
      const user = await authService.register(email, password);
      await authService.verifyEmail(user.verificationToken!);

      const loginResult = await authService.login(email, password);
      const verifiedUser = await authService.verifyJWT(loginResult.token);

      expect(verifiedUser.email).toBe(email);
      expect(verifiedUser.emailVerified).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      await expect(
        authService.verifyJWT('invalid-token')
      ).rejects.toThrow();
    });

    it('should throw error for empty token', async () => {
      await expect(
        authService.verifyJWT('')
      ).rejects.toThrow('Token is required');
    });
  });
});