import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import { initials, fullName } from '../../utils/formatters';
import './ui.css';

export { Icon };

const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------- Boutons ---------- */

export function Button({
  variant = 'secondary', size = 'md', icon, loading = false, children, className, type = 'button', disabled, ...rest
}) {
  return (
    <button
      type={type}
      className={cx('btn', `btn-${variant}`, `btn-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** Bouton d'action de ligne : toujours une icône + une étiquette accessible. */
export function IconButton({ icon, label, variant = 'ghost', className, ...rest }) {
  return (
    <button
      type="button"
      className={cx('icon-btn', `icon-btn-${variant}`, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

/* ---------- Formulaires ---------- */

export function Field({ label, error, hint, required, children, className }) {
  const id = useId();
  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined,
      })
    : children;
  return (
    <div className={cx('field', error && 'field-error', className)}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-req" aria-hidden="true"> *</span>}
      </label>
      {child}
      {error ? <p id={`${id}-err`} className="field-msg field-msg-error" role="alert">{error}</p>
        : hint && <p id={`${id}-hint`} className="field-msg">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx('control', className)} {...rest} />;
});

export function Select({ className, children, ...rest }) {
  return <select className={cx('control', 'control-select', className)} {...rest}>{children}</select>;
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx('control', 'control-textarea', className)} {...rest} />;
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', label = 'Rechercher', className }) {
  return (
    <div className={cx('search', className)}>
      <Icon name="search" size={16} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx('segmented-item', o.value === value && 'is-active')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Affichage ---------- */

export function Badge({ tone = 'neutral', children, dot = false, ...rest }) {
  return (
    <span className={cx('badge', `badge-${tone}`)} {...rest}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Avatar({ user, size = 36 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials(user)}
    </span>
  );
}

export function PersonCell({ user, sub }) {
  return (
    <div className="person">
      <Avatar user={user} size={34} />
      <div className="person-text">
        <span className="person-name">{fullName(user)}</span>
        {(sub ?? user?.matricule) && <span className="person-sub">{sub ?? user.matricule}</span>}
      </div>
    </div>
  );
}

export function Card({ title, subtitle, actions, children, padded = true, className }) {
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'card-body' : undefined}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, variant = 'hero' }) {
  if (variant === 'plain') {
    return (
      <div className="page-header page-header-plain">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    );
  }

  return (
    <section className="page-header page-hero" aria-label={title}>
      <div className="page-hero-copy">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-hero-action page-actions">{actions}</div>}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'neutral', icon }) {
  return (
    <div className={cx('stat', `stat-${tone}`)}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon"><Icon name={icon} size={16} /></span>}
      </div>
      <div className="stat-value num">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Progress({ value, tone = 'primary', label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('progress-bar', `progress-${tone}`)} style={{ width: `${v}%` }} />
    </div>
  );
}

/* ---------- États ---------- */

export function Spinner({ label = 'Chargement…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, children, action }) {
  return (
    <div className="state">
      <span className="state-icon"><Icon name={icon} size={22} /></span>
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" role="alert">
      <span className="state-icon state-icon-danger"><Icon name="alert" size={22} /></span>
      <strong>Impossible de charger les données</strong>
      <p className="muted">{message}</p>
      {onRetry && <Button icon="refresh" onClick={onRetry}>Réessayer</Button>}
    </div>
  );
}

/** Affiche chargement / erreur / contenu pour un résultat de useFetch. */
export function Async({ state, children, loadingLabel }) {
  if (state.loading && !state.data) return <Spinner label={loadingLabel} />;
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.reload} />;
  return children(state.data);
}

/* ---------- Tableau ---------- */

export function DataTable({
  columns, rows, rowKey = 'id', empty, dense = false, paginate = true, pageSizeOptions = [10, 20, 50],
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 10);
  const total = rows?.length || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  if (!rows || rows.length === 0) return empty || <EmptyState title="Aucun résultat" />;
  const visibleRows = paginate ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : rows;
  return (
    <>
      <div className="table-wrap">
        <table className={cx('table', dense && 'table-dense')}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ width: c.width, textAlign: c.align }}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? i}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }} className={c.className}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate && (
        <Pagination
          page={currentPage}
          pages={pages}
          total={total}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}
    </>
  );
}

/** Regroupe les boutons d'action d'une ligne. */
export function RowActions({ children }) {
  return <div className="row-actions">{children}</div>;
}

export function Pagination({
  page, pages, total, onChange, unit = 'résultats', pageSize = 10, pageSizeOptions = [10, 20, 50], onPageSizeChange,
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pageItems = [];
  if (pages <= 5) {
    for (let number = 1; number <= pages; number += 1) pageItems.push(number);
  } else if (page <= 3) {
    pageItems.push(1, 2, 3, 4, 'ellipsis', pages);
  } else if (page >= pages - 2) {
    pageItems.push(1, 'ellipsis', pages - 3, pages - 2, pages - 1, pages);
  } else {
    pageItems.push(1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', pages);
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-summary">{first}–{last} sur {total} {unit}</span>
      {pages > 1 && (
        <div className="pagination-pages">
          <button type="button" className="pagination-direction" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <Icon name="chevronLeft" size={16} /><span>Précédent</span>
          </button>
          {pageItems.map((item, index) => (
            typeof item === 'number' ? (
              <button
                type="button"
                key={item}
                className={`pagination-page${item === page ? ' is-active' : ''}`}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            ) : <span className="pagination-ellipsis" key={`${item}-${index}`} aria-hidden="true">…</span>
          ))}
          <button type="button" className="pagination-direction" disabled={page >= pages} onClick={() => onChange(page + 1)}>
            <span>Suivant</span><Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}
      <label className="pagination-size">
        <span>Lignes</span>
        <select value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))} aria-label="Nombre de lignes par page">
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
    </nav>
  );
}

/* ---------- Modale ---------- */

export function Modal({ title, onClose, children, footer, size = 'md', dismissible = true, className }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    const focusable = () => el.querySelectorAll('button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
    (el.querySelector('[data-autofocus]') || focusable()[0] || el).focus();

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose();
      if (e.key === 'Tab') {
        const items = Array.from(focusable()).filter((n) => !n.disabled);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [onClose, dismissible]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose(); }}>
      <div ref={ref} className={cx('modal', `modal-${size}`, className)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          {dismissible && <IconButton icon="x" label="Fermer" onClick={onClose} />}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
