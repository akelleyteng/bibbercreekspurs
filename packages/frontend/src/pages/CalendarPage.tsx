import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description: string;
  visibility: string;
  externalRegistrationUrl?: string;
  isAllDay: boolean;
}

type ViewType = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const token = localStorage.getItem('token');
    fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: `query { events { id title startTime endTime location description visibility externalRegistrationUrl isAllDay } }`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.data?.events) {
          setEvents(result.data.events);
        }
      })
      .catch(() => {});
  }, []);

  const handlePrevious = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.externalRegistrationUrl) {
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    }
    return 'bg-green-100 text-green-800 hover:bg-green-200';
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayEvents = events.filter((event) =>
          isSameDay(new Date(event.startTime), cloneDay)
        );

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border border-gray-200 ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50 text-gray-400'
                : isToday(day)
                ? 'bg-primary-50'
                : 'bg-white'
            }`}
          >
            <div
              className={`text-sm font-semibold mb-1 ${
                isToday(day) ? 'text-primary-600' : ''
              }`}
            >
              {formattedDate}
            </div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={`block text-xs px-2 py-1 rounded truncate ${getEventColor(event)}`}
                  title={event.title}
                >
                  {!event.isAllDay && format(new Date(event.startTime), 'h:mm a')}{' '}
                  {event.title}
                </Link>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayEvents = events.filter((event) => isSameDay(new Date(event.startTime), day));

      days.push(
        <div key={day.toString()} className="border border-gray-200 p-3 min-h-[300px]">
          <div
            className={`text-center font-semibold mb-3 ${
              isToday(day) ? 'text-primary-600' : 'text-gray-900'
            }`}
          >
            <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
            <div className={`text-2xl ${isToday(day) ? 'bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className={`block text-sm px-3 py-2 rounded ${getEventColor(event)}`}
              >
                {!event.isAllDay && (
                  <div className="font-semibold">{format(new Date(event.startTime), 'h:mm a')}</div>
                )}
                <div className="truncate">{event.title}</div>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return <div className="grid grid-cols-7 gap-0">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = events.filter((event) => isSameDay(new Date(event.startTime), currentDate));

    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No events scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!event.isAllDay && (
                      <span className="text-lg font-bold text-primary-600">
                        {format(new Date(event.startTime), 'h:mm a')}
                      </span>
                    )}
                    {event.isAllDay && (
                      <span className="text-lg font-bold text-primary-600">All Day</span>
                    )}
                    {event.externalRegistrationUrl && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        External Registration
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-2">{event.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                {event.location && (
                  <div className="text-sm text-gray-500">
                    &#128205; {event.location}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Club Calendar</h1>

        {/* View Switcher */}
        <div className="flex gap-2">
          {(['month', 'week', 'day'] as ViewType[]).map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                view === viewType
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {viewType}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <button onClick={handlePrevious} className="btn-secondary">
            &larr; Previous
          </button>
          <h2 className="text-xl font-bold">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
          </h2>
          <div className="flex gap-2">
            <button onClick={handleToday} className="btn-secondary">
              Today
            </button>
            <button onClick={handleNext} className="btn-secondary">
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card mb-6 flex items-center gap-6 text-sm">
        <div className="font-semibold text-gray-700">Legend:</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
          <span className="text-gray-600">Club Event (RSVP)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
          <span className="text-gray-600">External Registration</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
              (day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              )
            )}
          </div>
          {renderMonthView()}
        </div>
      )}

      {view === 'week' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {renderWeekView()}
        </div>
      )}

      {view === 'day' && renderDayView()}
    </div>
  );
}
