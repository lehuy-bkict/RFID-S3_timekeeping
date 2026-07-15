import React, { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './home.scss';
import { GetData } from '../../../../service/apiAdmin/ApiAreaService';

function Home() {
    // Hàm lấy ngày hôm nay và ngày hôm sau
    const getToday = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };
    const getTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // State for default entry/exit dates today and tomorrow
    const [entryDate, setEntryDate] = useState(getToday());
    const [exitDate, setExitDate] = useState(getTomorrow());
    const [stats, setStats] = useState({
        xeVao: 0,
        xeRa: 0,
        thietBi: 0
    });
    const [trafficData, setTrafficData] = useState([]);
    const [cardDistribution, setCardDistribution] = useState([
        { name: 'Xe vào', value: 0 },
        { name: 'Xe ra', value: 0 },
    ]);

    useEffect(() => {
        setStats({ xeVao: 0, xeRa: 0, thietBi: 0 });
        setCardDistribution([
            { name: 'Entry', value: 0 },
            { name: 'Exit', value: 0 }
        ]);
        setTrafficData([]);

        const fetchData = async () => {
            const fromdate = entryDate;
            const todate = exitDate;
            try {
                const res = await GetData({ fromDate:fromdate, toDate: todate });
                const data = Array.isArray(res.data.data) ? res.data.data : [];

                // Count records that have both CheckIn and CheckOut values
                const xeVao = data.filter(item => item.info?.CheckIn).length;
                const xeRa = data.filter(item => item.info?.CheckOut).length;
                const thietBiSet = new Set(data.map(item => item.deviceID).filter(Boolean));
                // Count vehicles still inside the parking lot (ispass === false)
                const xeTrongNhaXe = data.filter(item => item.ispass === false).length;

                // Aggregate statistics by day
                let dailyMap = {};
                data.forEach(item => {
                    if (item.info?.CheckIn) {
                        const date = new Date(item.info.CheckIn);
                        const label = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
                        if (!dailyMap[label]) dailyMap[label] = { time: label, entry: 0, exit: 0 };
                        dailyMap[label].entry++;
                    }
                    if (item.info?.CheckOut) {
                        const date = new Date(item.info.CheckOut);
                        const label = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
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
        <div className="dashboard-container">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Entry time</h3>
                    <input
                        type="date"
                        value={entryDate}
                        onChange={e => setEntryDate(e.target.value)}
                        className="stat-dropdown"
                    />
                </div>
                <div className="stat-card">
                    <h3>Exit time</h3>
                    <input
                        type="date"
                        value={exitDate}
                        onChange={e => setExitDate(e.target.value)}
                        className="stat-dropdown"
                    />
                </div>
                <div className="stat-card">
                    <h3>Vehicles entered</h3>
                    <div className="stat-value">{stats.xeVao}</div>
                </div>
                <div className="stat-card">
                    <h3>Vehicles exited</h3>
                    <div className="stat-value">{stats.xeRa}</div>
                </div>
                <div className="stat-card">
                    <h3>Devices</h3>
                    <div className="stat-value">{stats.thietBi}</div>
                </div>
                <div className="stat-card">
                    <h3>Vehicles inside</h3>
                    <div className="stat-value">{stats.xeTrongNhaXe}</div>
                </div>
            </div>
            
            <div className="charts-container">
                <div className="chart-card">
                    <h3>Traffic by day</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trafficData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="entry" stroke="#8884d8" name="Entry" />
                            <Line type="monotone" dataKey="exit" stroke="#82ca9d" name="Exit" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>Entry/Exit distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={cardDistribution}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label
                            >
                                <Cell key="Entry" fill="#8884d8" />
                                <Cell key="Exit" fill="#82ca9d" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Home;