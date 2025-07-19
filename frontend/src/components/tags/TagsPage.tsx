import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  TagIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Tag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
  strategiesCount?: number;
}

export const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });
  const [submitting, setSubmitting] = useState(false);

  // Mock colors for tags
  const tagColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      // Mock data since the API might not be fully implemented
      const mockTags: Tag[] = [
        {
          id: 1,
          name: 'High Growth',
          color: '#3B82F6',
          createdAt: '2025-07-15T10:00:00Z',
          strategiesCount: 3
        },
        {
          id: 2,
          name: 'Value Investing',
          color: '#10B981',
          createdAt: '2025-07-14T15:30:00Z',
          strategiesCount: 2
        },
        {
          id: 3,
          name: 'Tech Stocks',
          color: '#8B5CF6',
          createdAt: '2025-07-13T09:15:00Z',
          strategiesCount: 4
        },
        {
          id: 4,
          name: 'Dividend Focus',
          color: '#F59E0B',
          createdAt: '2025-07-12T14:20:00Z',
          strategiesCount: 1
        }
      ];
      setTags(mockTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingTag) {
        // Update existing tag
        const updatedTag = {
          ...editingTag,
          name: formData.name,
          color: formData.color
        };
        setTags(tags.map(tag => tag.id === editingTag.id ? updatedTag : tag));
      } else {
        // Create new tag
        const newTag: Tag = {
          id: Math.max(...tags.map(t => t.id), 0) + 1,
          name: formData.name,
          color: formData.color,
          createdAt: new Date().toISOString(),
          strategiesCount: 0
        };
        setTags([...tags, newTag]);
      }
      
      // Reset form
      setFormData({ name: '', color: '#3B82F6' });
      setShowCreateForm(false);
      setEditingTag(null);
    } catch (error) {
      console.error('Failed to save tag:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color || '#3B82F6' });
    setShowCreateForm(true);
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return;
    }

    try {
      setTags(tags.filter(tag => tag.id !== tagId));
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const cancelForm = () => {
    setShowCreateForm(false);
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6' });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <TagIcon className="h-8 w-8 text-blue-600 mr-3" />
                Tags
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Organize your strategies with custom tags
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Tag
            </button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              <button
                onClick={cancelForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tag name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <div className="flex space-x-1">
                      {tagColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim()}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tags Grid */}
        {tags.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tags yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first tag to organize your strategies.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Tag
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: tag.color }}
                    />
                    <h3 className="text-lg font-medium text-gray-900">{tag.name}</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Strategies:</span>
                    <span className="font-medium text-gray-900">{tag.strategiesCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};