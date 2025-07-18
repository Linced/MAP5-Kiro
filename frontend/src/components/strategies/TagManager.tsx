import React, { useState, useEffect } from 'react';
import { Tag, CreateTagRequest, UpdateTagRequest } from '../../types';
import apiService from '../../services/api';

interface TagManagerProps {
  onTagChange?: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({ onTagChange }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  const [formData, setFormData] = useState<CreateTagRequest>({
    name: '',
    color: '#3B82F6'
  });

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#64748B', '#DC2626', '#059669', '#D97706', '#7C3AED'
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTags();
      
      if (response.success) {
        setTags(response.data);
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let response: any;
      if (editingTag) {
        response = await apiService.updateTag(editingTag.id, formData as UpdateTagRequest);
      } else {
        response = await apiService.createTag(formData);
      }

      if (response.success) {
        if (editingTag) {
          setTags(prev => prev.map(tag => 
            tag.id === editingTag.id ? response.data : tag
          ));
        } else {
          setTags(prev => [...prev, response.data]);
        }
        
        resetForm();
        onTagChange?.();
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#3B82F6'
    });
    setShowForm(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Are you sure you want to delete "${tag.name}"? This will remove the tag from all strategies.`)) {
      return;
    }

    try {
      const response = await apiService.deleteTag(tag.id);
      
      if (response.success) {
        setTags(prev => prev.filter(t => t.id !== tag.id));
        onTagChange?.();
      } else {
        setError(response.error.message);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete tag');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#3B82F6'
    });
    setEditingTag(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Strategy Tags</h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
        >
          Add Tag
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tag Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingTag ? 'Edit Tag' : 'Create New Tag'}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., High Risk, Momentum, Breakout"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded border border-gray-300"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingTag ? 'Update Tag' : 'Create Tag'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tag List */}
      {tags.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No tags created yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create Your First Tag
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tag Grid */}
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <div
                key={tag.id}
                className="group relative bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  />
                  <span className="font-medium text-gray-900">{tag.name}</span>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                      title="Edit tag"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Delete tag"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Created: {new Date(tag.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Tag Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Tag Preview</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-sm rounded-full border"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                    borderColor: tag.color || '#D1D5DB',
                    color: tag.color || '#6B7280'
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This is how tags will appear on strategy cards
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;