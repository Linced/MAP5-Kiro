import { StrategyService } from '../StrategyService';
import { BucketService } from '../BucketService';
import { TagService } from '../TagService';
import { initializeDatabase, closeDatabase } from '../../database';
import { CreateStrategyRequest, UpdateStrategyRequest, QueryOptions } from '../../types';

describe('StrategyService', () => {
  let strategyService: StrategyService;
  let bucketService: BucketService;
  let tagService: TagService;
  let testUserId: number;
  let testBucketId: number;
  let testTagIds: number[];

  beforeAll(async () => {
    await initializeDatabase();
    strategyService = new StrategyService();
    bucketService = new BucketService();
    tagService = new TagService();
    testUserId = 1;

    // Create test bucket and tags
    const bucket = await bucketService.createBucket(testUserId, {
      name: 'Test Bucket',
      description: 'Test bucket for strategies',
      color: '#FF0000'
    });
    testBucketId = bucket.id;

    const tag1 = await tagService.createTag(testUserId, {
      name: 'Momentum',
      color: '#00FF00'
    });
    const tag2 = await tagService.createTag(testUserId, {
      name: 'Swing',
      color: '#0000FF'
    });
    testTagIds = [tag1.id, tag2.id];
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('createStrategy', () => {
    it('should create a strategy successfully', async () => {
      const strategyData: CreateStrategyRequest = {
        name: 'Test Strategy',
        description: 'A test trading strategy',
        bucketId: testBucketId,
        entryRules: [
          {
            condition: 'RSI < 30',
            operator: 'and',
            value: 30,
            description: 'Oversold condition'
          }
        ],
        exitRules: [
          {
            type: 'take_profit',
            value: 5,
            description: '5% profit target'
          }
        ],
        riskManagement: {
          maxPositionSize: 1000,
          stopLossPercentage: 2,
          takeProfitPercentage: 5
        },
        notes: 'Test strategy notes',
        tagIds: testTagIds
      };

      const strategy = await strategyService.createStrategy(testUserId, strategyData);

      expect(strategy).toBeDefined();
      expect(strategy.id).toBeGreaterThan(0);
      expect(strategy.name).toBe(strategyData.name);
      expect(strategy.description).toBe(strategyData.description);
      expect(strategy.bucketId).toBe(testBucketId);
      expect(strategy.entryRules).toEqual(strategyData.entryRules);
      expect(strategy.exitRules).toEqual(strategyData.exitRules);
      expect(strategy.riskManagement).toEqual(strategyData.riskManagement);
      expect(strategy.notes).toBe(strategyData.notes);
      expect(strategy.isActive).toBe(true);
      expect(strategy.bucket).toBeDefined();
      expect(strategy.bucket!.name).toBe('Test Bucket');
      expect(strategy.tags).toHaveLength(2);
      expect(strategy.tags!.map(t => t.name)).toContain('Momentum');
      expect(strategy.tags!.map(t => t.name)).toContain('Swing');
    });

    it('should create a strategy without bucket and tags', async () => {
      const strategyData: CreateStrategyRequest = {
        name: 'Simple Strategy',
        entryRules: [
          {
            condition: 'Price > MA20',
            operator: 'and',
            value: 0
          }
        ],
        exitRules: [
          {
            type: 'stop_loss',
            value: 3
          }
        ],
        riskManagement: {
          maxPositionSize: 500
        }
      };

      const strategy = await strategyService.createStrategy(testUserId, strategyData);

      expect(strategy).toBeDefined();
      expect(strategy.name).toBe(strategyData.name);
      expect(strategy.bucketId).toBeNull();
      expect(strategy.bucket).toBeUndefined();
      expect(strategy.tags).toHaveLength(0);
    });
  });

  describe('updateStrategy', () => {
    let strategyId: number;

    beforeEach(async () => {
      const strategyData: CreateStrategyRequest = {
        name: 'Strategy to Update',
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      };
      const strategy = await strategyService.createStrategy(testUserId, strategyData);
      strategyId = strategy.id;
    });

    it('should update strategy successfully', async () => {
      const updates: UpdateStrategyRequest = {
        name: 'Updated Strategy Name',
        description: 'Updated description',
        isActive: false
      };

      const updatedStrategy = await strategyService.updateStrategy(testUserId, strategyId, updates);

      expect(updatedStrategy.name).toBe(updates.name);
      expect(updatedStrategy.description).toBe(updates.description);
      expect(updatedStrategy.isActive).toBe(false);
    });

    it('should return existing strategy when no updates provided', async () => {
      const originalStrategy = await strategyService.getStrategyById(testUserId, strategyId);
      const updatedStrategy = await strategyService.updateStrategy(testUserId, strategyId, {});

      expect(updatedStrategy.name).toBe(originalStrategy.name);
      expect(updatedStrategy.updatedAt.getTime()).toBeGreaterThanOrEqual(originalStrategy.updatedAt.getTime());
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        strategyService.updateStrategy(testUserId, 99999, { name: 'Test' })
      ).rejects.toThrow('Strategy not found or access denied');
    });
  });

  describe('deleteStrategy', () => {
    it('should delete strategy successfully', async () => {
      const strategyData: CreateStrategyRequest = {
        name: 'Strategy to Delete',
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      };
      const strategy = await strategyService.createStrategy(testUserId, strategyData);

      await strategyService.deleteStrategy(testUserId, strategy.id);

      await expect(
        strategyService.getStrategyById(testUserId, strategy.id)
      ).rejects.toThrow('Strategy not found');
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        strategyService.deleteStrategy(testUserId, 99999)
      ).rejects.toThrow('Strategy not found or access denied');
    });
  });

  describe('getUserStrategies', () => {
    beforeEach(async () => {
      // Create multiple test strategies
      for (let i = 1; i <= 3; i++) {
        await strategyService.createStrategy(testUserId, {
          name: `Test Strategy ${i}`,
          entryRules: [{ condition: `test${i}`, operator: 'and', value: i }],
          exitRules: [{ type: 'stop_loss', value: i }],
          riskManagement: { maxPositionSize: i * 100 },
          bucketId: i === 1 ? testBucketId : undefined
        });
      }
    });

    it('should get user strategies with default options', async () => {
      const strategies = await strategyService.getUserStrategies(testUserId);

      expect(strategies.length).toBeGreaterThanOrEqual(3);
      expect(strategies[0].name).toContain('Test Strategy');
    });

    it('should filter strategies by name', async () => {
      const options: QueryOptions = {
        page: 1,
        limit: 10,
        filters: [
          { column: 'name', operator: 'contains', value: 'Test Strategy 1' }
        ]
      };

      const strategies = await strategyService.getUserStrategies(testUserId, options);

      expect(strategies.length).toBeGreaterThanOrEqual(1);
      expect(strategies[0].name).toContain('Test Strategy 1');
    });

    it('should filter strategies by bucket', async () => {
      const options: QueryOptions = {
        page: 1,
        limit: 10,
        filters: [
          { column: 'bucket_id', operator: 'eq', value: testBucketId }
        ]
      };

      const strategies = await strategyService.getUserStrategies(testUserId, options);

      expect(strategies.length).toBeGreaterThanOrEqual(1);
      expect(strategies[0].bucketId).toBe(testBucketId);
    });

    it('should sort strategies by name', async () => {
      const options: QueryOptions = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const strategies = await strategyService.getUserStrategies(testUserId, options);

      expect(strategies.length).toBeGreaterThan(1);
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i].name >= strategies[i - 1].name).toBe(true);
      }
    });
  });

  describe('getStrategyById', () => {
    it('should get strategy by id successfully', async () => {
      const strategyData: CreateStrategyRequest = {
        name: 'Get Strategy Test',
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      };
      const createdStrategy = await strategyService.createStrategy(testUserId, strategyData);

      const strategy = await strategyService.getStrategyById(testUserId, createdStrategy.id);

      expect(strategy).toBeDefined();
      expect(strategy.id).toBe(createdStrategy.id);
      expect(strategy.name).toBe(strategyData.name);
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        strategyService.getStrategyById(testUserId, 99999)
      ).rejects.toThrow('Strategy not found');
    });
  });

  describe('assignStrategyToBucket', () => {
    let strategyId: number;

    beforeEach(async () => {
      const strategy = await strategyService.createStrategy(testUserId, {
        name: 'Bucket Assignment Test',
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      });
      strategyId = strategy.id;
    });

    it('should assign strategy to bucket successfully', async () => {
      await strategyService.assignStrategyToBucket(strategyId, testBucketId);

      const strategy = await strategyService.getStrategyById(testUserId, strategyId);
      expect(strategy.bucketId).toBe(testBucketId);
      expect(strategy.bucket).toBeDefined();
      expect(strategy.bucket!.name).toBe('Test Bucket');
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        strategyService.assignStrategyToBucket(99999, testBucketId)
      ).rejects.toThrow('Strategy not found');
    });
  });

  describe('addTagsToStrategy', () => {
    let strategyId: number;

    beforeEach(async () => {
      const strategy = await strategyService.createStrategy(testUserId, {
        name: 'Tag Assignment Test',
        entryRules: [{ condition: 'test', operator: 'and', value: 1 }],
        exitRules: [{ type: 'stop_loss', value: 2 }],
        riskManagement: { maxPositionSize: 100 }
      });
      strategyId = strategy.id;
    });

    it('should add tags to strategy successfully', async () => {
      await strategyService.addTagsToStrategy(strategyId, testTagIds);

      const strategy = await strategyService.getStrategyById(testUserId, strategyId);
      expect(strategy.tags).toHaveLength(2);
      expect(strategy.tags!.map(t => t.name)).toContain('Momentum');
      expect(strategy.tags!.map(t => t.name)).toContain('Swing');
    });

    it('should replace existing tags', async () => {
      // First add all tags
      await strategyService.addTagsToStrategy(strategyId, testTagIds);

      // Then replace with just one tag
      await strategyService.addTagsToStrategy(strategyId, [testTagIds[0]]);

      const strategy = await strategyService.getStrategyById(testUserId, strategyId);
      expect(strategy.tags).toHaveLength(1);
      expect(strategy.tags![0].name).toBe('Momentum');
    });

    it('should handle empty tag array', async () => {
      await strategyService.addTagsToStrategy(strategyId, []);

      const strategy = await strategyService.getStrategyById(testUserId, strategyId);
      expect(strategy.tags).toHaveLength(0);
    });
  });
});