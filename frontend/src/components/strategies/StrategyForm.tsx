import React, { useState, useEffect } from 'react';
import { 
  Strategy, 
  CreateStrategyRequest, 
  UpdateStrategyRequest, 
  StrategyBucket, 
  Tag, 
  EntryRule, 
  ExitRule, 
  RiskParameters 
} from '../../types';
import apiService from '../../services/api';

interface StrategyFormProps {
  strategy?: Strategy;
  onSave: (strategy: Strategy) => void;
  onCancel: () => void;
}

const StrategyForm: React.FC<StrategyFormProps> = ({ strategy, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CreateStrategyRequest>({
    name: '',
    description: '',
    isActive: true,
    tags: [],
    buckets: [],
    bucketId: undefined,
    entryRules: [{ id: '1', type: 'entry', condition: '', operator: 'and', value: 0, description: '' }],
    exitRules: [{ id: '1', type: 'exit', condition: '', operator: 'and', value: 0, description: '' }],
    riskManagement: {
      stopLoss: 0,
      takeProfit: 0,
      maxDrawdown: 0,
      positionSize: 0
    },
    notes: '',
    tagIds: []
  });

  const [buckets, setBuckets] = useState<StrategyBucket[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBucketsAndTags();
    if (strategy) {
      setFormData({
        name: strategy.name,
        description: strategy.description || '',
        isActive: strategy.isActive,
        tags: strategy.tags?.map(tag => tag.name) || [],
        buckets: strategy.buckets || [],
        bucketId: strategy.bucketId,
        entryRules: strategy.entryRules.length > 0 ? strategy.entryRules : [{ id: '1', type: 'entry', condition: '', operator: 'and', value: 0, description: '' }],
        exitRules: strategy.exitRules.length > 0 ? strategy.exitRules : [{ id: '1', type: 'exit', condition: '', operator: 'and', value: 0, description: '' }],
        riskManagement: strategy.riskManagement,
        notes: strategy.notes || '',
        tagIds: strategy.tags?.map(tag => tag.id) || []
      });
    }
  }, [strategy]);

  const loadBucketsAndTags = async () => {
    try {
      const [bucketsResponse, tagsResponse] = await Promise.all([
        apiService.getBuckets(),
        apiService.getTags()
      ]);

      if (bucketsResponse.success) {
        setBuckets(bucketsResponse.data);
      }
      if (tagsResponse.success) {
        setTags(tagsResponse.data);
      }
    } catch (error) {
      console.error('Error loading buckets and tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (strategy) {
        response = await apiService.updateStrategy(strategy.id, formData as UpdateStrategyRequest);
      } else {
        response = await apiService.createStrategy(formData);
      }

      if (response.success) {
        onSave(response.data);
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addEntryRule = () => {
    setFormData(prev => ({
      ...prev,
      entryRules: [...prev.entryRules, { id: Date.now().toString(), type: 'entry', condition: '', operator: 'and', value: 0, description: '' }]
    }));
  };

  const removeEntryRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entryRules: prev.entryRules.filter((_, i) => i !== index)
    }));
  };

  const updateEntryRule = (index: number, field: keyof EntryRule, value: any) => {
    setFormData(prev => ({
      ...prev,
      entryRules: prev.entryRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const addExitRule = () => {
    setFormData(prev => ({
      ...prev,
      exitRules: [...prev.exitRules, { id: Date.now().toString(), type: 'exit', condition: '', operator: 'and', value: 0, description: '' }]
    }));
  };

  const removeExitRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exitRules: prev.exitRules.filter((_, i) => i !== index)
    }));
  };

  const updateExitRule = (index: number, field: keyof ExitRule, value: any) => {
    setFormData(prev => ({
      ...prev,
      exitRules: prev.exitRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const updateRiskManagement = (field: keyof RiskParameters, value: number | undefined) => {
    setFormData(prev => ({
      ...prev,
      riskManagement: {
        ...prev.riskManagement,
        [field]: value
      }
    }));
  };

  const toggleTag = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds?.includes(tagId) 
        ? prev.tagIds.filter(id => id !== tagId)
        : [...(prev.tagIds || []), tagId]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        {strategy ? 'Edit Strategy' : 'Create New Strategy'}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bucket
            </label>
            <select
              value={formData.bucketId || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                bucketId: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Bucket</option>
              {buckets.map(bucket => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Entry Rules */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Entry Rules</h3>
            <button
              type="button"
              onClick={addEntryRule}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              Add Rule
            </button>
          </div>
          
          {formData.entryRules.map((rule, index) => (
            <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <input
                    type="text"
                    value={rule.condition}
                    onChange={(e) => updateEntryRule(index, 'condition', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="e.g., RSI < 30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateEntryRule(index, 'operator', e.target.value as 'and' | 'or')}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateEntryRule(index, 'value', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeEntryRule(index)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    disabled={formData.entryRules.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={rule.description || ''}
                  onChange={(e) => updateEntryRule(index, 'description', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Optional description"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Exit Rules */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Exit Rules</h3>
            <button
              type="button"
              onClick={addExitRule}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
            >
              Add Rule
            </button>
          </div>
          
          {formData.exitRules.map((rule, index) => (
            <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={rule.type}
                    onChange={(e) => updateExitRule(index, 'type', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="stop_loss">Stop Loss</option>
                    <option value="take_profit">Take Profit</option>
                    <option value="time_based">Time Based</option>
                    <option value="condition">Condition</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {rule.type === 'condition' ? 'Condition' : 'Value'}
                  </label>
                  <input
                    type="text"
                    value={rule.type === 'condition' ? (rule.condition || '') : (rule.value || '')}
                    onChange={(e) => updateExitRule(index, rule.type === 'condition' ? 'condition' : 'value', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder={rule.type === 'condition' ? 'e.g., RSI > 70' : 'e.g., 5%'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={rule.description || ''}
                    onChange={(e) => updateExitRule(index, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Optional description"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeExitRule(index)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    disabled={formData.exitRules.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Risk Management */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Position Size
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.riskManagement.maxPositionSize || ''}
                onChange={(e) => updateRiskManagement('maxPositionSize', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Loss %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.riskManagement.stopLossPercentage || ''}
                onChange={(e) => updateRiskManagement('stopLossPercentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 2.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Take Profit %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.riskManagement.takeProfitPercentage || ''}
                onChange={(e) => updateRiskManagement('takeProfitPercentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5.0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Daily Loss
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.riskManagement.maxDailyLoss || ''}
                onChange={(e) => updateRiskManagement('maxDailyLoss', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Drawdown %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.riskManagement.maxDrawdown || ''}
                onChange={(e) => updateRiskManagement('maxDrawdown', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10.0"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.tagIds?.includes(tag.id)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                  style={{
                    backgroundColor: formData.tagIds?.includes(tag.id) ? (tag.color || '#3B82F6') : undefined,
                    borderColor: tag.color || undefined
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about this strategy..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : (strategy ? 'Update Strategy' : 'Create Strategy')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StrategyForm;