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
  isBefore,
  isToday,
  startOfDay,
} from 'date-fns';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { authFetch } from '../utils/authFetch';
import { parseEventDate } from '../utils/dateUtils';
import { formatDescription } from '../utils/formatDescription';

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

/**
 * Check if a calendar day falls within an event's date range.
 * Handles multi-day events (shows on every day from start through end).
 * Google Calendar all-day event end dates are exclusive (a 3-day event
 * Feb 23-25 has end = "2026-02-26"), so we compare day < endDate.
 */
function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const start = startOfDay(parseEventDate(event.startTime));
  const end = startOfDay(parseEventDate(event.endTime));
  const target = startOfDay(day);

  // Single-day or timed event: check if same day as start
  if (isSameDay(start, end)) {
    return isSameDay(start, target);
  }

  // Multi-day: target >= start && target < end (end is exclusive for all-day events)
  return (isSameDay(start, target) || isBefore(start, target)) && isBefore(target, end);
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    authFetch(`query { events { id title startTime endTime location description visibility externalRegistrationUrl isAllDay } }`)
      .then((result) => {
        if (result.data?.events) {
          setEvents(result.data.events);
        }
      })
      .catch(() => {});
  }, []);

  const handlePrevious = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
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
        const dayEvents = events.filter((event) => eventOccursOnDay(event, cloneDay));

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[48px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50 text-gray-400'
                : isToday(day)
                ? 'bg-primary-50'
                : 'bg-white'
            }`}
          >
            <div
              className={`text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 ${
                isToday(day) ? 'text-primary-600' : ''
              }`}
            >
              {formattedDate}
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              {dayEvents.slice(0, window.innerWidth < 640 ? 2 : 5).map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={`block text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate ${getEventColor(event)}`}
                  title={event.title}
                >
                  <span className="hidden sm:inline">
                    {!event.isAllDay && format(parseEventDate(event.startTime), 'h:mm a')}{' '}
                  </span>
                  {event.title}
                </Link>
              ))}
              {dayEvents.length > (window.innerWidth < 640 ? 2 : 5) && (
                <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - (window.innerWidth < 640 ? 2 : 5)} more</div>
              )}
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

    // On mobile, show a list layout instead of 7-column grid
    return (
      <>
        {/* Desktop: 7-column grid */}
        <div className="hidden sm:grid grid-cols-7 gap-0">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const dayEvents = events.filter((event) => eventOccursOnDay(event, day));
            return (
              <div key={day.toString()} className="border border-gray-200 p-3 min-h-[300px]">
                <div className={`text-center font-semibold mb-3 ${isToday(day) ? 'text-primary-600' : 'text-gray-900'}`}>
                  <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                  <div className={`text-2xl ${isToday(day) ? 'bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <Link key={event.id} to={`/events/${event.id}`} className={`block text-sm px-3 py-2 rounded ${getEventColor(event)}`}>
                      {!event.isAllDay && <div className="font-semibold">{format(parseEventDate(event.startTime), 'h:mm a')}</div>}
                      <div className="truncate">{event.title}</div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: stacked list */}
        <div className="sm:hidden space-y-2">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const dayEvents = events.filter((event) => eventOccursOnDay(event, day));
            return (
              <div key={day.toString()} className={`border border-gray-200 rounded-lg p-3 ${isToday(day) ? 'bg-primary-50 border-primary-300' : 'bg-white'}`}>
                <div className={`font-semibold text-sm mb-2 ${isToday(day) ? 'text-primary-600' : 'text-gray-900'}`}>
                  {format(day, 'EEE, MMM d')}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-gray-400">No events</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <Link key={event.id} to={`/events/${event.id}`} className={`block text-sm px-3 py-2 rounded ${getEventColor(event)}`}>
                        {!event.isAllDay && <span className="font-semibold mr-1">{format(parseEventDate(event.startTime), 'h:mm a')}</span>}
                        <span>{event.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderDayView = () => {
    const dayEvents = events.filter((event) => eventOccursOnDay(event, currentDate));

    return (
      <div className="card">
        <h3 className="text-lg sm:text-xl font-bold mb-4">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {!event.isAllDay && (
                      <span className="text-base sm:text-lg font-bold text-primary-600">
                        {format(parseEventDate(event.startTime), 'h:mm a')}
                      </span>
                    )}
                    {event.isAllDay && (
                      <span className="text-base sm:text-lg font-bold text-primary-600">All Day</span>
                    )}
                    {event.externalRegistrationUrl && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        External
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-base sm:text-lg mb-2">{event.title}</h4>
                <div className="prose prose-sm max-w-none text-gray-600 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: formatDescription(event.description) }} />
                {event.location && (
                  <div className="text-sm text-gray-500 truncate">
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
      {/* Header: title + view switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Club Calendar</h1>
        <div className="flex gap-1 sm:gap-2">
          {(['month', 'week', 'day'] as ViewType[]).map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium capitalize ${
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
      <div className="card mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2">
          <button onClick={handlePrevious} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Previous">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-bold truncate">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')}`}
              {view === 'day' && format(currentDate, 'MMM d, yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleToday} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">
              Today
            </button>
            <button onClick={handleNext} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Next">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card mb-4 sm:mb-6 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
        <div className="font-semibold text-gray-700">Legend:</div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-200 rounded"></div>
          <span className="text-gray-600">Club Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-100 border border-orange-200 rounded"></div>
          <span className="text-gray-600">External</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {DAY_NAMES_FULL.map((day, i) => (
              <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-semibold text-gray-700">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
              </div>
            ))}
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
