import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useFetch from '../../hooks/useFetch';
import useInterval from '../../hooks/useInterval';
import useLeaveDecision from '../../hooks/useLeaveDecision';
import { leavesApi, pointagesApi, servicesApi, statsApi } from '../../services/api';
import {
  Async, Badge, Button, Card, EmptyState, Icon, PageHeader, PersonCell, Select,
} from '../../components/ui';
import { HourlyChart } from '../../components/charts/charts';
import { isRh } from '../../utils/roles';
import {
  BUILDING_LABEL, TYPE_LABEL, formatDate, formatLongDate, formatTime, isLate, plural, todayIso, workingDays,
} from '../../utils/formatters';
import './admin.css';

const percentageFormatter = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });
const percentage = (value, total) => percentageFormatter.format(total > 0 ? value / total : 0);

function DashboardKpi({ tone, label, value, hint }) {
  return (
    <article className={`dashboard-kpi dashboard-kpi-${tone}`}>
      <div className="dashboard-kpi-label"><span aria-hidden="true" />{label}</div>
      <strong className="dashboard-kpi-value num">{value}</strong>
      <p className="dashboard-kpi-hint">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const rh = isRh(user);
  const base = rh ? '/admin' : '/equipe';
  const [department, setDepartment] = useState('');
  const params = department ? { departmentId: department } : {};
  const services = useFetch(() => servicesApi.list(), []);

  const today = useFetch(async () => {
    const [summary, hourly, latest, leaves] = await Promise.all([
      statsApi.summary(params),
      statsApi.hourly(params),
      pointagesApi.today(params),
      rh ? leavesApi.list() : Promise.resolve({ data: [] }),
    ]);
    return {
      kpis: summary.kpis || {},
      hourly: hourly.data || [],
      latest: (latest.data || []).slice(0, 5),
      pending: (leaves.data || []).filter((leave) => leave.status === 'PENDING'),
    };
  }, [department]);
  useInterval(() => today.reload({ silent: true }), 30000);
  const decision = useLeaveDecision(() => today.reload({ silent: true }));
  const serviceList = services.data?.data || [];

  return (
    <div className="admin-dashboard">
      <PageHeader
        variant="plain"
        title={`Bonjour ${user?.prenom || ''}`.trim()}
        subtitle={(
          <span className="dashboard-date">
            {formatLongDate(todayIso())}
            <span className="dashboard-live" title="Actualisé automatiquement" aria-label="Actualisé automatiquement" />
          </span>
        )}
        actions={(
          <Select
            className="dashboard-filter"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            aria-label="Filtrer par service"
          >
            <option value="">{rh ? 'Tous les services' : 'Toute mon équipe'}</option>
            {serviceList.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            {rh && services.data?.unassigned > 0 && <option value="none">Sans service</option>}
          </Select>
        )}
      />

      <Async state={today}>
        {({ kpis, hourly, latest, pending }) => {
          const total = kpis.totalAgents ?? 0;
          const present = kpis.agentsPresent ?? 0;
          const late = kpis.lateArrivals ?? 0;
          const absent = kpis.agentsAbsent ?? 0;
          const leave = kpis.agentsOnLeave ?? 0;
          const trendUrl = `${base}/rapports?tab=trends`;

          return (
            <>
              <section className="dashboard-kpis" aria-label="Indicateurs du jour">
                <DashboardKpi
                  tone="present"
                  label="Présents"
                  value={present}
                  hint={(
                    <>
                      <span>sur {total} agents · {percentage(present, total)}</span>
                      <span className="dashboard-kpi-hint-detail">
                        Siège {kpis.byBuilding?.SIEGE ?? 0} · Annexe {kpis.byBuilding?.ANNEXE ?? 0}
                      </span>
                    </>
                  )}
                />
                <DashboardKpi tone="late" label="Retards" value={late} hint={`sur ${total} agents · ${percentage(late, total)}`} />
                <DashboardKpi tone="absent" label="Absents" value={absent} hint={`sur ${total} agents · ${percentage(absent, total)}`} />
                <DashboardKpi tone="leave" label="En congé" value={leave} hint={`sur ${total} agents · ${percentage(leave, total)}`} />
              </section>

              <section className={`dashboard-columns${rh ? ' has-leaves' : ''}`} aria-label="Activité du jour">
                <Card className="dashboard-hourly" title="Affluence du jour">
                  <HourlyChart data={hourly} dashboard />
                </Card>

                <div className="dashboard-side">
                  {rh && (
                    <Card
                      className="dashboard-list-card"
                      title="Congés à valider"
                      padded={false}
                    >
                      {pending.length === 0 ? (
                        <EmptyState icon="check" title="Aucune demande en attente">Tout est à jour.</EmptyState>
                      ) : (
                        <ul className="dashboard-leaves">
                          {pending.slice(0, 3).map((leaveRequest) => {
                            const leaveName = leaveRequest.userName || 'Agent';
                            const days = workingDays(leaveRequest.startDate, leaveRequest.endDate);
                            return (
                              <li className="dashboard-leave" key={leaveRequest.id}>
                                <div className="dashboard-leave-info">
                                  <strong>{leaveName}</strong>
                                  <span>{formatDate(leaveRequest.startDate)} – {formatDate(leaveRequest.endDate)} · {plural(days, 'jour', 'jours')}</span>
                                </div>
                                <div className="dashboard-leave-actions">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    icon="check"
                                    disabled={decision.busy}
                                    aria-label={`Approuver la demande de ${leaveName}`}
                                    title={`Approuver la demande de ${leaveName}`}
                                    onClick={() => decision.approve(leaveRequest)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    icon="x"
                                    disabled={decision.busy}
                                    aria-label={`Refuser la demande de ${leaveName}`}
                                    title={`Refuser la demande de ${leaveName}`}
                                    onClick={() => decision.reject(leaveRequest)}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <Link className="dashboard-list-footer dashboard-link" to="/admin/conges">
                        Voir tout ({pending.length}) <Icon name="arrowRight" size={15} />
                      </Link>
                    </Card>
                  )}

                  <Card
                    className="dashboard-list-card dashboard-recent-card"
                    title="Derniers pointages"
                    padded={false}
                    actions={<Link className="dashboard-link" to={`${base}/pointages`}>Voir tout <Icon name="arrowRight" size={15} /></Link>}
                  >
                    {latest.length === 0 ? (
                      <EmptyState icon="clock" title="Aucun pointage aujourd’hui" />
                    ) : (
                      <ul className="feed dashboard-recent">
                        {latest.map((pointage) => (
                          <li key={pointage.id}>
                            <div className="feed-main">
                              <PersonCell user={pointage.agent} sub={BUILDING_LABEL[pointage.building]} />
                            </div>
                            <Badge tone={pointage.type === 'ENTRY' ? (isLate(pointage.datetime) ? 'warning' : 'success') : 'info'}>
                              {TYPE_LABEL[pointage.type]}
                            </Badge>
                            <span className="feed-time num">{formatTime(pointage.datetime)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {latest.length > 0 && (
                      <Link className="dashboard-list-footer dashboard-link" to={`${base}/pointages`}>
                        Voir tout <Icon name="arrowRight" size={15} />
                      </Link>
                    )}
                  </Card>
                </div>
              </section>

              <div className="dashboard-trends-link">
                <Link className="dashboard-link" to={trendUrl}>
                  Voir l’évolution et l’assiduité <Icon name="arrowRight" size={15} />
                </Link>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
