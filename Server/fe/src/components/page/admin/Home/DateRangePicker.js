import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiChevronDown, FiX } from 'react-icons/fi';
import './DateRangePicker.scss';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format Date to YYYY-MM-DD
const formatDateToISO = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to format Date to DD/MM/YYYY for display
const formatDateToDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const DateRangePicker = ({ startDate = '', endDate = '', onChange, maxDays = 30 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Internal temporary selection
    const [tempStart, setTempStart] = useState(startDate);
    const [tempEnd, setTempEnd] = useState(endDate);
    const [warningMsg, setWarningMsg] = useState('');

    const containerRef = useRef(null);

    // Sync when props change
    useEffect(() => {
        setTempStart(startDate);
        setTempEnd(endDate);
        if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) {
                setCurrentMonth(d.getMonth());
                setCurrentYear(d.getFullYear());
            }
        }
    }, [startDate, endDate]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setWarningMsg('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Year options: past 10 years to next 5 years
    const yearOptions = [];
    const thisYear = new Date().getFullYear();
    for (let y = thisYear - 10; y <= thisYear + 5; y++) {
        yearOptions.push(y);
    }

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    // Days matrix generation
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    // Day selection handler
    const handleDayClick = (day) => {
        setWarningMsg('');
        const clickedISO = formatDateToISO(new Date(currentYear, currentMonth, day));
        const clickedTime = new Date(currentYear, currentMonth, day).setHours(0,0,0,0);

        // Case 1: Neither is set, or both are already set -> start fresh
        if (!tempStart || (tempStart && tempEnd)) {
            setTempStart(clickedISO);
            setTempEnd('');
            return;
        }

        // Case 2: tempStart is set, picking tempEnd
        if (tempStart && !tempEnd) {
            const startTime = new Date(tempStart).setHours(0,0,0,0);

            if (clickedTime < startTime) {
                // User clicked an earlier date -> reset start to this earlier date
                setTempStart(clickedISO);
                setTempEnd('');
                return;
            }

            // Check maxDays constraint
            const diffDays = Math.round((clickedTime - startTime) / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > maxDays) {
                setWarningMsg(`Maximum range is ${maxDays} days!`);
                return;
            }

            setTempEnd(clickedISO);
            // Fire parent change
            if (onChange) {
                onChange({ startDate: tempStart, endDate: clickedISO });
            }
            setIsOpen(false);
        }
    };

    const handleClear = (e) => {
        if (e) e.stopPropagation();
        setTempStart('');
        setTempEnd('');
        setWarningMsg('');
        if (onChange) {
            onChange({ startDate: '', endDate: '' });
        }
    };

    // Render cells for calendar
    const calendarCells = [];
    // Blank days
    for (let i = 0; i < firstDay; i++) {
        calendarCells.push(<div key={`blank-${i}`} className="calendar-cell empty"></div>);
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(currentYear, currentMonth, day);
        const cellISO = formatDateToISO(cellDate);
        const cellTime = cellDate.setHours(0, 0, 0, 0);

        const startTime = tempStart ? new Date(tempStart).setHours(0, 0, 0, 0) : null;
        const endTime = tempEnd ? new Date(tempEnd).setHours(0, 0, 0, 0) : null;

        const isStart = tempStart === cellISO;
        const isEnd = tempEnd === cellISO;

        let isInRange = false;
        if (startTime && endTime) {
            isInRange = cellTime > startTime && cellTime < endTime;
        }

        // Disable if beyond maxDays from tempStart
        let isDisabled = false;
        if (tempStart && !tempEnd && startTime) {
            const diffDays = Math.round((cellTime - startTime) / (1000 * 60 * 60 * 24)) + 1;
            if (cellTime > startTime && diffDays > maxDays) {
                isDisabled = true;
            }
        }

        const classNames = ['calendar-cell', 'day-cell'];
        if (isStart) classNames.push('range-start');
        if (isEnd) classNames.push('range-end');
        if (isInRange) classNames.push('in-range');
        if (isDisabled) classNames.push('disabled');
        if (cellISO === formatDateToISO(new Date())) classNames.push('today');

        calendarCells.push(
            <div
                key={`day-${day}`}
                className={classNames.join(' ')}
                onClick={() => !isDisabled && handleDayClick(day)}
            >
                <span className="day-number">{day}</span>
            </div>
        );
    }

    // Single trigger text representation: e.g. "11/06/2022 - 11/07/2022" or "DD/MM/YYYY - DD/MM/YYYY"
    const getDisplayText = () => {
        if (tempStart && tempEnd) {
            return `${formatDateToDisplay(tempStart)} - ${formatDateToDisplay(tempEnd)}`;
        }
        if (tempStart) {
            return `${formatDateToDisplay(tempStart)} - DD/MM/YYYY`;
        }
        return 'DD/MM/YYYY - DD/MM/YYYY';
    };

    return (
        <div className="custom-date-range-picker" ref={containerRef}>
            {/* Single input trigger */}
            <div 
                className={`range-single-box ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <FiCalendar className="cal-icon" />
                <span className="date-text">
                    {getDisplayText()}
                </span>
                {(tempStart || tempEnd) && (
                    <button 
                        type="button" 
                        className="btn-clear-inline" 
                        onClick={handleClear}
                        title="Clear filter"
                    >
                        <FiX />
                    </button>
                )}
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="calendar-popover">
                    {/* Header with Navigation and Month/Year Dropdowns */}
                    <div className="calendar-header">
                        <button type="button" className="nav-btn" onClick={handlePrevMonth}>
                            <FiChevronLeft />
                        </button>

                        <div className="selectors-group">
                            <div className="select-wrapper">
                                <select 
                                    value={currentMonth} 
                                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                    className="month-select"
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={name} value={idx}>{name}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="select-icon" />
                            </div>

                            <div className="select-wrapper">
                                <select 
                                    value={currentYear} 
                                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                                    className="year-select"
                                >
                                    {yearOptions.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="select-icon" />
                            </div>
                        </div>

                        <button type="button" className="nav-btn" onClick={handleNextMonth}>
                            <FiChevronRight />
                        </button>
                    </div>

                    {/* Weekdays row */}
                    <div className="weekdays-row">
                        {WEEKDAYS.map(w => (
                            <div key={w} className="weekday-cell">{w}</div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="days-grid">
                        {calendarCells}
                    </div>

                    {/* Warning badge if max days exceeded */}
                    {warningMsg && (
                        <div className="warning-banner">
                            {warningMsg}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="calendar-footer">
                        <span className="info-badge">Max {maxDays} days</span>
                        <div className="action-btns">
                            <button 
                                type="button" 
                                className="btn-all-time"
                                onClick={handleClear}
                            >
                                All history
                            </button>
                            <button 
                                type="button" 
                                className="btn-done"
                                onClick={() => {
                                    if (tempStart && !tempEnd) {
                                        setTempEnd(tempStart);
                                        if (onChange) onChange({ startDate: tempStart, endDate: tempStart });
                                    }
                                    setIsOpen(false);
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
