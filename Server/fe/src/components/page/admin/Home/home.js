import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  FaArrowRightToBracket, 
  FaArrowRightFromBracket, 
  FaMicrochip, 
  FaBuildingUser,
  FaCalendarDays
} from 'react-icons/fa6';
import { GetData } from '../../../../service/apiAdmin/ApiAreaService';
import DateRangePicker from './DateRangePicker';
import './home.scss';

const PIE_COLORS = ['#1877F2', '#22C55E'];

function Home() {
    // State for default entry/exit dates - default empty to fetch all historical data
    const [entryDate, setEntryDate] = useState('');
    const [exitDate, setExitDate] = useState('');
    const [stats, setStats] = useState({
        xeVao: 0,
        xeRa: 0,
        thietBi: 0,
        xeTrongNhaXe: 0
    });
    const [trafficData, setTrafficData] = useState([]);
    const [cardDistribution, setCardDistribution] = useState([
        { name: 'Entry', value: 0 },
        { name: 'Exit', value: 0 },
    ]);

    useEffect(() => {
        setStats({ xeVao: 0, xeRa: 0, thietBi: 0, xeTrongNhaXe: 0 });
        setCardDistribution([
            { name: 'Entry', value: 0 },
            { name: 'Exit', value: 0 }
        ]);
        setTrafficData([]);

        const fetchData = async () => {
            const params = {};
            if (entryDate) params.fromDate = entryDate;
            if (exitDate) params.toDate = exitDate;
            try {
                const res = await GetData(params);
                const data = Array.isArray(res?.data?.data) ? res.data.data : [];

                const xeVao = data.filter(item => item.info?.CheckIn).length;
                const xeRa = data.filter(item => item.info?.CheckOut).length;
                const thietBiSet = new Set(data.map(item => item.deviceID).filter(Boolean));
                const xeTrongNhaXe = data.filter(item => item.ispass === false).length;

                let dailyMap = {};
                data.forEach(item => {
                    if (item.info?.CheckIn) {
                        const date = new Date(item.info.CheckIn);
                        const label = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                        if (!dailyMap[label]) dailyMap[label] = { time: label, entry: 0, exit: 0 };
                        dailyMap[label].entry++;
                    }
                    if (item.info?.CheckOut) {
                        const date = new Date(item.info.CheckOut);
                        const label = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                        if (!dailyMap[label]) dailyMap[label] = { time: label, entry: 0, exit: 0 };
                        dailyMap[label].exit++;
                    }
                });

                setStats({
                    xeVao,
                    xeRa,
                    thietBi: thietBiSet.size,
                    xeTrongNhaXe
                });

                setCardDistribution([
                    { name: 'Entry', value: xeVao },
                    { name: 'Exit', value: xeRa }
                ]);

                const trafficArr = Object.values(dailyMap).sort((a, b) => a.time.localeCompare(b.time));
                setTrafficData(trafficArr);

            } catch (e) {
                setStats({ xeVao: 0, xeRa: 0, thietBi: 0, xeTrongNhaXe: 0 });
                setCardDistribution([
                    { name: 'Entry', value: 0 },
                    { name: 'Exit', value: 0 }
                ]);
                setTrafficData([]);
            }
        };
        fetchData();
    }, [entryDate, exitDate]);

    return (
        <div className="home-dashboard-view">
            {/* Top Toolbar / Filter */}
            <div className="dashboard-filter-card">
                <div className="filter-title-box">
                    <div className="filter-icon-circle">
                        <FaCalendarDays />
                    </div>
                    <div>
                        <h4 className="filter-heading">Date Range Filter</h4>
                        <p className="filter-desc">Filter statistics by check-in and check-out timestamp</p>
                    </div>
                </div>
                <div className="filter-picker-box">
                    <DateRangePicker
                        startDate={entryDate}
                        endDate={exitDate}
                        onChange={({ startDate, endDate }) => {
                            setEntryDate(startDate);
                            setExitDate(endDate);
                        }}
                        maxDays={30}
                    />
                </div>
            </div>

            {/* Material Kit Summary Widgets Grid */}
            <div className="analytics-summary-grid">
                {/* 1. Clients Entered */}
                <div className="minimal-summary-widget color-primary">
                    <div className="widget-icon-box">
                        <FaArrowRightToBracket />
                    </div>
                    <div className="widget-content">
                        <div className="widget-total">{stats.xeVao.toLocaleString()}</div>
                        <div className="widget-title">Clients Entered</div>
                    </div>
                </div>

                {/* 2. Clients Exited */}
                <div className="minimal-summary-widget color-success">
                    <div className="widget-icon-box">
                        <FaArrowRightFromBracket />
                    </div>
                    <div className="widget-content">
                        <div className="widget-total">{stats.xeRa.toLocaleString()}</div>
                        <div className="widget-title">Clients Exited</div>
                    </div>
                </div>

                {/* 3. Devices Connected */}
                <div className="minimal-summary-widget color-info">
                    <div className="widget-icon-box">
                        <FaMicrochip />
                    </div>
                    <div className="widget-content">
                        <div className="widget-total">{stats.thietBi.toLocaleString()}</div>
                        <div className="widget-title">Active Devices</div>
                    </div>
                </div>

                {/* 4. Clients Inside */}
                <div className="minimal-summary-widget color-warning">
                    <div className="widget-icon-box">
                        <FaBuildingUser />
                    </div>
                    <div className="widget-content">
                        <div className="widget-total">{stats.xeTrongNhaXe.toLocaleString()}</div>
                        <div className="widget-title">Clients Inside</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="analytics-charts-grid">
                {/* Traffic by Day Chart */}
                <div className="minimal-chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Daily Traffic Overview</h3>
                        <span className="chart-subtitle">Entries and Exits recorded over time</span>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px'
                                    }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="entry" 
                                    stroke="#1877F2" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#1877F2' }}
                                    activeDot={{ r: 6 }}
                                    name="Entry" 
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="exit" 
                                    stroke="#22C55E" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#22C55E' }}
                                    activeDot={{ r: 6 }}
                                    name="Exit" 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="minimal-chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Entry / Exit Ratio</h3>
                        <span className="chart-subtitle">Proportion of clients checked in vs checked out</span>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={cardDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    label
                                >
                                    {cardDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '8px', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px'
                                    }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
