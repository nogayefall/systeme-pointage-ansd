import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Reports.css';
import StatisticsKPIs from '../components/StatisticsKPIs';
import PointageChart from '../components/PointageChart';
import AttendanceChart from '../components/AttendanceChart';
import ReportTable from '../components/ReportTable';

export const Statistics = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  // === STATISTIQUES STATE ===
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);
  const [kpis, setKpis] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendDays, setTrendDays] = useState(30);
  const [agentAttendanceData, setAgentAttendanceData] = useState([]);
  const [selectedPeriodStart, setSelectedPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [selectedPeriodEnd, setSelectedPeriodEnd] = useState(new Date().toISOString().split('T')[0]);

  // === STATISTIQUES: Charger KPIs ===
  const fetchKPIs = useCallback(async () => {
    try {
      const response = await api.get(`/statistics/summary?date=${statsDate}`);
      setKpis(response.data.kpis);
    } catch (err) {
      console.error('Erreur:', err);
    }
  }, [statsDate]);

  // === STATISTIQUES: Charger distribution horaire ===
  const fetchHourlyDistribution = useCallback(async () => {
    try {
      const response = await api.get(`/statistics/hourly-distribution?date=${statsDate}`);
      setHourlyData(response.data.data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  }, [statsDate]);

  // === STATISTIQUES: Charger tendance ===
  const fetchTrend = useCallback(async () => {
    try {
      const response = await api.get(`/statistics/daily-trend?days=${trendDays}`);
      setTrendData(response.data.data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  }, [trendDays]);

  // === STATISTIQUES: Charger assiduité agents ===
  const fetchAgentAttendance = useCallback(async () => {
    try {
      const params = new URLSearchParams({ dateStart: selectedPeriodStart, dateEnd: selectedPeriodEnd });
      const response = await api.get(`/statistics/agent-attendance?${params}`);
      setAgentAttendanceData(response.data.agents || []);
    } catch (err) {
      console.error('Erreur:', err);
    }
  }, [selectedPeriodStart, selectedPeriodEnd]);

  // Charger toutes les stats au montage
  useEffect(() => {
    fetchKPIs();
    fetchHourlyDistribution();
    fetchTrend();
    fetchAgentAttendance();
  }, [fetchKPIs, fetchHourlyDistribution, fetchTrend, fetchAgentAttendance]);

  return (
    <div className="statistics-container">
      <header className="reports-header">
        <h1>📈 Statistiques</h1>
      </header>

      <div className="statistics-tab">
        {/* KPIs */}
        <StatisticsKPIs
          kpis={kpis}
          date={statsDate}
          onDateChange={setStatsDate}
          loading={loading}
        />

        {/* Graphiques */}
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Pointages par Heure</h3>
            <PointageChart data={hourlyData} />
          </div>

          <div className="chart-wrapper">
            <h3>Tendance sur {trendDays} jours</h3>
            <div className="trend-controls">
              <button
                className={trendDays === 7 ? 'active' : ''}
                onClick={() => setTrendDays(7)}
              >
                7j
              </button>
              <button
                className={trendDays === 30 ? 'active' : ''}
                onClick={() => setTrendDays(30)}
              >
                30j
              </button>
              <button
                className={trendDays === 90 ? 'active' : ''}
                onClick={() => setTrendDays(90)}
              >
                90j
              </button>
            </div>
            <PointageChart data={trendData} type="trend" />
          </div>

          <div className="chart-wrapper">
            <h3>Assiduité des Agents</h3>
            <div className="attendance-period">
              <input
                type="date"
                value={selectedPeriodStart}
                onChange={(e) => setSelectedPeriodStart(e.target.value)}
              />
              <span>à</span>
              <input
                type="date"
                value={selectedPeriodEnd}
                onChange={(e) => setSelectedPeriodEnd(e.target.value)}
              />
            </div>
            <AttendanceChart data={agentAttendanceData} />
          </div>
        </div>
      </div>
    </div>
  );
};
