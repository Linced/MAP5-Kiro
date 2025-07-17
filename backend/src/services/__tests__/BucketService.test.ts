import { BucketService } from '../BucketService';
import { StrategyService } from '../StrategyService';
import { initializeDatabase, closeDatabase } from '../../database';
import { CreateBucketRequest, UpdateBucketRequest, CreateStrategyRequest } from '../../types';

describe('BucketService', () => {
  let bucketService: BucketService;
  let strategyService: StrategyService;
  let testUserId: number;

  beforeAll(async () => {
    await initializeDatabase();
    bucketService = new BucketService();
    strategyService = new StrategyService();
    testUserId = 1;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createBucket', () => {
    it('should create a bucket successfully', async () => {
      const bucketData: CreateBucketRequest = {
        name: 'Test Bucket',
        description: 'A test bucket for strategies',
        color: '#FF0000'
      };

      const bucket = await bucketService.createBucket(testUserId, bucketData);

      expect(bucket).toBeDefined();
      expect(bucket.id).toBeGreaterThan(0);
      expect(bucket.name).toBe(bucketData.name);
      expect(bucket.description).toBe(bucketData.description);
      expect(bucket.color).toBe(bucketData.color);
      expect(bucket.userId).toBe(testUserId);
      expect(bucket.createdAt).toBeInstanceOf(Date);
      expect(bucket.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a bucket with minimal data', async () => {
      const bucketData: CreateBucketRequest = {
        name: 'Minimal Bucket'
      };

      const bucket = await bucketService.createBucket(testUserId, bucketData);

      expect(bucket).toBeDefined();
      expect(bucket.name).toBe(bucketData.name);
      expect(bucket.description).toBeNull();
      expect(bucket.color).toBeNull();
    });
  });

  describe('updateBucket', () => {
    let bucketId: number;

    beforeEach(async () => {
      const bucket = await bucketService.createBucket(testUserId, {
        name: 'Bucket to Update',
        description: 'Original description',
        color: '#00FF00'
      });
      bucketId = bucket.id;
    });

    it('should update bucket successfully', async () => {
      const updates: UpdateBucketRequest = {
        name: 'Updated Bucket Name',
        description: 'Updated description',
        color: '#0000FF'
      };

      const updatedBucket = await bucketService.updateBucket(testUserId, bucketId, updates);

      expect(updatedBucket.name).toBe(updates.name);
      expect(updatedBucket.description).toBe(updates.description);
      expect(updatedBucket.color).toBe(updates.color);
      expect(updatedBucket.updatedAt.getTime()).toBeGreaterThan(updatedBucket.createdAt.getTime());
    });

    it('should update only provided fields', async () => {
      const originalBucket = await bucketService.getUserBuckets(testUserId);
      const targetBucket = originalBucket.find(b => b.id === bucketId)!;
      
      const updates: UpdateBucketRequest = {
        name: 'Only Name Updated'
      };

      const updatedBucket = await bucketService.updateBucket(testUserId, bucketId, updates);

      expect(updatedBucket.name).toBe(updates.name);
      expect(updatedBucket.description).toBe(targetBucket.description);
      expect(updatedBucket.color).toBe(targetBucket.color);
    });

    it('should return existing bucket when no updates provided', async () => {
      const originalBucket = await bucketService.getUserBuckets(testUserId);
      const targetBucket = originalBucket.find(b => b.id === bucketId)!;
      
      const updatedBucket = await bucketService.updateBucket(testUserId, bucketId, {});

      expect(updatedBucket.name).toBe(targetBucket.name);
      expect(updatedBucket.description).toBe(targetBucket.description);
      expect(updatedBucket.color).toBe(targetBucket.color);
    });

    it('should throw error for non-existent bucket', async () => {
      await expect(
        bucketService.updateBucket(testUserId, 99999, { name: 'Test' })
      ).rejects.toThrow('Bucket not found or access denied');
    });
  });

  describe('deleteBucket', () => {
    it('should delete empty bucket successfully', async () => {
      const bucket = await bucketService.createBucket(testUserId, {
        name: 'Bucket to Delete'
      });

      await bucketService.deleteBucket(testUserId, bucket.id);

      const buckets = await bucketService.getUserBuckets(testUserId);
      expect(buckets.find(b => b.id === bucket.id)).toBeUndefined();
    });

    it('should delete bucket with strategies and unassign them', async () => {
      // Create bucket
      const bucket = await bucketService.createBucket(testUserId, {
        name: 'Bucket with Strategies'
      });

      // Create strategy in bucket
      const strategyData: CreateStrategyRequest = {
        name: 'Strategy in Bucket',
        bucketId: bucket.id,
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      };
      const strategy = await strategyService.createStrategy(testUserId, strategyData);

      // Delete bucket
      await bucketService.deleteBucket(testUserId, bucket.id);

      // Check that strategy still exists but bucket is null
      const updatedStrategy = await strategyService.getStrategyById(testUserId, strategy.id);
      expect(updatedStrategy.bucketId).toBeNull();
      expect(updatedStrategy.bucket).toBeUndefined();
    });

    it('should throw error for non-existent bucket', async () => {
      await expect(
        bucketService.deleteBucket(testUserId, 99999)
      ).rejects.toThrow('Bucket not found or access denied');
    });
  });

  describe('getUserBuckets', () => {
    beforeEach(async () => {
      // Create multiple test buckets
      await bucketService.createBucket(testUserId, { name: 'Alpha Bucket' });
      await bucketService.createBucket(testUserId, { name: 'Beta Bucket' });
      await bucketService.createBucket(testUserId, { name: 'Gamma Bucket' });
    });

    it('should get user buckets sorted by name', async () => {
      const buckets = await bucketService.getUserBuckets(testUserId);

      expect(buckets.length).toBeGreaterThanOrEqual(3);
      
      // Check if sorted by name
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i].name >= buckets[i - 1].name).toBe(true);
      }
    });

    it('should return empty array for user with no buckets', async () => {
      const nonExistentUserId = 99999;
      const buckets = await bucketService.getUserBuckets(nonExistentUserId);

      expect(buckets).toEqual([]);
    });
  });

  describe('getStrategiesInBucket', () => {
    let bucketId: number;

    beforeEach(async () => {
      const bucket = await bucketService.createBucket(testUserId, {
        name: 'Bucket with Strategies'
      });
      bucketId = bucket.id;

      // Create strategies in bucket
      for (let i = 1; i <= 3; i++) {
        await strategyService.createStrategy(testUserId, {
          name: `Strategy ${i} in Bucket`,
          bucketId: bucketId,
          entryRules: [{ condition: `test${i}`, operator: 'and', value: i }],
          exitRules: [{ type: 'stop_loss', value: i }],
          riskManagement: { maxPositionSize: i * 100 }
        });
      }
    });

    it('should get strategies in bucket', async () => {
      const strategies = await bucketService.getStrategiesInBucket(testUserId, bucketId);

      expect(strategies.length).toBe(3);
      strategies.forEach(strategy => {
        expect(strategy.bucketId).toBe(bucketId);
        expect(strategy.bucket).toBeDefined();
        expect(strategy.bucket!.name).toBe('Bucket with Strategies');
        expect(strategy.name).toContain('in Bucket');
      });
    });

    it('should return empty array for bucket with no strategies', async () => {
      const emptyBucket = await bucketService.createBucket(testUserId, {
        name: 'Empty Bucket'
      });

      const strategies = await bucketService.getStrategiesInBucket(testUserId, emptyBucket.id);

      expect(strategies).toEqual([]);
    });

    it('should return strategies sorted by name', async () => {
      const strategies = await bucketService.getStrategiesInBucket(testUserId, bucketId);

      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i].name >= strategies[i - 1].name).toBe(true);
      }
    });
  });
});