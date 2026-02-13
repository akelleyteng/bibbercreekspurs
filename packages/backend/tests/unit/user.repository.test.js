"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_repository_1 = require("../../src/repositories/user.repository");
const database_1 = __importDefault(require("../../src/models/database"));
const shared_1 = require("@4hclub/shared");
// Mock the database module
jest.mock('../../src/models/database', () => ({
    __esModule: true,
    default: {
        query: jest.fn(),
        transaction: jest.fn(),
    },
}));
describe('UserRepository - Unit Tests', () => {
    let userRepository;
    const mockDb = database_1.default;
    beforeEach(() => {
        userRepository = new user_repository_1.UserRepository();
        jest.clearAllMocks();
    });
    describe('create', () => {
        const mockUserData = {
            email: 'test@example.com',
            password_hash: '$2b$10$hashedpassword',
            first_name: 'John',
            last_name: 'Doe',
            role: shared_1.Role.MEMBER,
        };
        const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
        it('should create a new user and return user object', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: mockUserId,
                        email: mockUserData.email,
                        first_name: mockUserData.first_name,
                        last_name: mockUserData.last_name,
                        role: mockUserData.role,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
                command: 'INSERT',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.create(mockUserData);
            expect(user).toBeDefined();
            expect(user.id).toBe(mockUserId);
            expect(user.email).toBe(mockUserData.email);
            expect(user.first_name).toBe(mockUserData.first_name);
            expect(user.last_name).toBe(mockUserData.last_name);
            expect(user.role).toBe(mockUserData.role);
            expect(user).not.toHaveProperty('password_hash'); // Should not expose password
        });
        it('should call database with correct SQL and parameters', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [{ id: mockUserId, ...mockUserData, created_at: new Date(), updated_at: new Date() }],
                command: 'INSERT',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            await userRepository.create(mockUserData);
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('INSERT INTO users');
            expect(call[1]).toEqual([
                mockUserData.email,
                mockUserData.password_hash,
                mockUserData.first_name,
                mockUserData.last_name,
                mockUserData.role,
                null, // phone
                null, // address
                null, // emergency_contact
                null, // emergency_phone
            ]);
        });
        it('should throw error if email already exists', async () => {
            mockDb.query.mockRejectedValueOnce({
                code: '23505', // Unique violation
                constraint: 'users_email_key',
            });
            await expect(userRepository.create(mockUserData)).rejects.toThrow('Email already exists');
        });
        it('should throw error for database failures', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));
            await expect(userRepository.create(mockUserData)).rejects.toThrow();
        });
    });
    describe('findByEmail', () => {
        const mockEmail = 'test@example.com';
        const mockUser = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: mockEmail,
            password_hash: '$2b$10$hashedpassword',
            first_name: 'John',
            last_name: 'Doe',
            role: shared_1.Role.MEMBER,
            created_at: new Date(),
            updated_at: new Date(),
        };
        it('should return user when found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [mockUser],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.findByEmail(mockEmail);
            expect(user).toBeDefined();
            expect(user?.email).toBe(mockEmail);
            expect(user?.password_hash).toBe(mockUser.password_hash); // Should include password for auth
        });
        it('should return null when user not found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'SELECT',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.findByEmail('nonexistent@example.com');
            expect(user).toBeNull();
        });
        it('should call database with correct SQL and parameters', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'SELECT',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            await userRepository.findByEmail(mockEmail);
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('SELECT');
            expect(call[0]).toContain('FROM users');
            expect(call[0]).toContain('WHERE email = $1');
            expect(call[1]).toEqual([mockEmail]);
        });
        it('should handle database errors', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database error'));
            await expect(userRepository.findByEmail(mockEmail)).rejects.toThrow();
        });
    });
    describe('findById', () => {
        const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
        const mockUser = {
            id: mockUserId,
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: shared_1.Role.MEMBER,
            created_at: new Date(),
            updated_at: new Date(),
        };
        it('should return user when found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [mockUser],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.findById(mockUserId);
            expect(user).toBeDefined();
            expect(user?.id).toBe(mockUserId);
            expect(user).not.toHaveProperty('password_hash'); // Should not include password
        });
        it('should return null when user not found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'SELECT',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.findById('nonexistent-id');
            expect(user).toBeNull();
        });
        it('should call database with correct SQL and parameters', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'SELECT',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            await userRepository.findById(mockUserId);
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('SELECT');
            expect(call[0]).toContain('FROM users');
            expect(call[0]).toContain('WHERE id = $1');
            expect(call[1]).toEqual([mockUserId]);
        });
    });
    describe('update', () => {
        const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
        const updateData = {
            first_name: 'Jane',
            last_name: 'Smith',
        };
        it('should update user and return updated user', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: mockUserId,
                        email: 'test@example.com',
                        first_name: updateData.first_name,
                        last_name: updateData.last_name,
                        role: shared_1.Role.MEMBER,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
                command: 'UPDATE',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.update(mockUserId, updateData);
            expect(user).toBeDefined();
            expect(user?.first_name).toBe(updateData.first_name);
            expect(user?.last_name).toBe(updateData.last_name);
        });
        it('should return null when user not found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'UPDATE',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            const user = await userRepository.update('nonexistent-id', updateData);
            expect(user).toBeNull();
        });
        it('should only update provided fields', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        id: mockUserId,
                        email: 'test@example.com',
                        first_name: updateData.first_name,
                        last_name: 'Doe', // Not updated
                        role: shared_1.Role.MEMBER,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
                command: 'UPDATE',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            await userRepository.update(mockUserId, { first_name: updateData.first_name });
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('UPDATE users');
            expect(call[0]).toContain('SET');
            expect(call[0]).toContain('updated_at = CURRENT_TIMESTAMP');
        });
        it('should not allow updating email or password_hash directly', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'UPDATE',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            await userRepository.update(mockUserId, {
                first_name: 'Jane',
                email: 'newemail@example.com',
            });
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('SET first_name');
            expect(call[0]).not.toContain('password_hash');
        });
    });
    describe('delete', () => {
        const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
        it('should delete user and return true', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'DELETE',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            const result = await userRepository.delete(mockUserId);
            expect(result).toBe(true);
        });
        it('should return false when user not found', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'DELETE',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            const result = await userRepository.delete('nonexistent-id');
            expect(result).toBe(false);
        });
        it('should call database with correct SQL and parameters', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'DELETE',
                rowCount: 1,
                oid: 0,
                fields: [],
            });
            await userRepository.delete(mockUserId);
            expect(mockDb.query).toHaveBeenCalledTimes(1);
            const call = mockDb.query.mock.calls[0];
            expect(call[0]).toContain('DELETE FROM users');
            expect(call[0]).toContain('WHERE id = $1');
            expect(call[1]).toEqual([mockUserId]);
        });
    });
    describe('findAll', () => {
        const mockUsers = [
            {
                id: '1',
                email: 'user1@example.com',
                first_name: 'User',
                last_name: 'One',
                role: shared_1.Role.MEMBER,
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: '2',
                email: 'user2@example.com',
                first_name: 'User',
                last_name: 'Two',
                role: shared_1.Role.OFFICER,
                created_at: new Date(),
                updated_at: new Date(),
            },
        ];
        it('should return all users', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: mockUsers,
                command: 'SELECT',
                rowCount: mockUsers.length,
                oid: 0,
                fields: [],
            });
            const users = await userRepository.findAll();
            expect(users).toHaveLength(2);
            expect(users[0].email).toBe('user1@example.com');
            expect(users[1].email).toBe('user2@example.com');
        });
        it('should return empty array when no users exist', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
                command: 'SELECT',
                rowCount: 0,
                oid: 0,
                fields: [],
            });
            const users = await userRepository.findAll();
            expect(users).toEqual([]);
        });
        it('should not include password_hash in results', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: mockUsers,
                command: 'SELECT',
                rowCount: mockUsers.length,
                oid: 0,
                fields: [],
            });
            const users = await userRepository.findAll();
            users.forEach((user) => {
                expect(user).not.toHaveProperty('password_hash');
            });
        });
    });
});
//# sourceMappingURL=user.repository.test.js.map