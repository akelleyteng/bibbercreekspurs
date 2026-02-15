import { Visibility } from '@4hclub/shared';
import { useState, useEffect } from 'react';

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  eventType: 'internal' | 'external';
  visibility: Visibility;
  externalRegistrationUrl?: string;
  imageUrl?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
  recurringDaysOfWeek?: string[];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => void;
  initialData?: Partial<EventFormData>;
  mode: 'create' | 'edit';
}

export default function EventModal({ isOpen, onClose, onSave, initialData, mode }: EventModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate || '',
    startTime: initialData?.startTime || '',
    endDate: initialData?.endDate || '',
    endTime: initialData?.endTime || '',
    location: initialData?.location || '',
    eventType: initialData?.eventType || 'internal',
    visibility: initialData?.visibility || Visibility.PUBLIC,
    externalRegistrationUrl: initialData?.externalRegistrationUrl || '',
    imageUrl: initialData?.imageUrl || '',
    isRecurring: initialData?.isRecurring || false,
    recurringFrequency: initialData?.recurringFrequency || 'weekly',
    recurringEndDate: initialData?.recurringEndDate || '',
    recurringDaysOfWeek: initialData?.recurringDaysOfWeek || [],
  });

  useEffect(() => {
    setFormData({
      title: initialData?.title || '',
      description: initialData?.description || '',
      startDate: initialData?.startDate || '',
      startTime: initialData?.startTime || '',
      endDate: initialData?.endDate || '',
      endTime: initialData?.endTime || '',
      location: initialData?.location || '',
      eventType: initialData?.eventType || 'internal',
      visibility: initialData?.visibility || Visibility.PUBLIC,
      externalRegistrationUrl: initialData?.externalRegistrationUrl || '',
      imageUrl: initialData?.imageUrl || '',
      isRecurring: initialData?.isRecurring || false,
      recurringFrequency: initialData?.recurringFrequency || 'weekly',
      recurringEndDate: initialData?.recurringEndDate || '',
      recurringDaysOfWeek: initialData?.recurringDaysOfWeek || [],
    });
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof EventFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleDayOfWeek = (day: string) => {
    const days = formData.recurringDaysOfWeek || [];
    if (days.includes(day)) {
      handleChange('recurringDaysOfWeek', days.filter(d => d !== day));
    } else {
      handleChange('recurringDaysOfWeek', [...days, day]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="event-modal-title" className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create New Event' : 'Edit Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="County Fair Preparation Workshop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  className="input"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    className="input"
                    value={formData.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    className="input"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Community Center - Main Hall"
                />
              </div>
            </div>

            {/* Event Image */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image (Optional)
              </label>
              {formData.imageUrl && (
                <div className="mb-3">
                  <img
                    src={formData.imageUrl}
                    alt="Event preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
              <input
                type="url"
                className="input mb-2"
                value={formData.imageUrl || ''}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://example.com/event-image.jpg"
              />
              <div className="flex gap-2">
                <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        alert('In production, this would upload to cloud storage. For now, use the Image URL field above.');
                      }
                    }}
                  />
                  📁 Upload Image
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Add an image to make your event more engaging
              </p>
            </div>

            {/* Event Type & Visibility */}
            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="eventType"
                      value="internal"
                      checked={formData.eventType === 'internal'}
                      onChange={(e) => handleChange('eventType', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">📍 Internal (RSVP)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="eventType"
                      value="external"
                      checked={formData.eventType === 'external'}
                      onChange={(e) => handleChange('eventType', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">🔗 External (Register Online)</span>
                  </label>
                </div>
              </div>

              {formData.eventType === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    External Registration URL *
                  </label>
                  <input
                    type="url"
                    required
                    className="input"
                    value={formData.externalRegistrationUrl}
                    onChange={(e) => handleChange('externalRegistrationUrl', e.target.value)}
                    placeholder="https://example.com/register"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value={Visibility.PUBLIC}
                      checked={formData.visibility === Visibility.PUBLIC}
                      onChange={(e) => handleChange('visibility', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">🌐 Public</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value={Visibility.MEMBER_ONLY}
                      checked={formData.visibility === Visibility.MEMBER_ONLY}
                      onChange={(e) => handleChange('visibility', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">🔒 Members Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Recurring Options */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">🔄 Recurring Event</span>
              </label>

              {formData.isRecurring && (
                <div className="space-y-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      className="input"
                      value={formData.recurringFrequency}
                      onChange={(e) => handleChange('recurringFrequency', e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {formData.recurringFrequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repeat on
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDayOfWeek(day)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              formData.recurringDaysOfWeek?.includes(day)
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleChange('recurringEndDate', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to continue indefinitely
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {mode === 'create' ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
