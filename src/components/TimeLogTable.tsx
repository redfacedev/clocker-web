import { useState } from 'react';
import { formatTime, formatDate, formatDuration, getDurationSeconds, isActive } from '../utils/TimeUtils';
import { LogSortColumn, Tag, TimeLog } from '../types';
import ConfirmDialog from './ConfirmDialog';
import TagDropdown from './TagDropdown';
import './TimeLogTable.css';

interface Props {
  logs: TimeLog[];
  tags: Tag[];
  onEdit: (log: TimeLog) => void;
  onDelete: (log: TimeLog) => void;
  onSort: (column: LogSortColumn) => void;
  onTagChange: (log: TimeLog, tagId: string | null) => void;
  onCreateTag: (log: TimeLog) => void;
  onDeleteTag: (tagId: string) => void;
  onEditTag: (tagId: string, tagData: Omit<Tag, 'id'>) => void;
  sortColumn: LogSortColumn;
  sortOrder: 'asc' | 'desc';
}

function TimeLogTable({ logs, tags, onEdit, onDelete, onSort, onTagChange, onCreateTag, onDeleteTag, onEditTag, sortColumn, sortOrder }: Props) {
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<TimeLog | null>(null);

  const getSortIcon = (column: LogSortColumn) => {
    if (sortColumn !== column) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="table-container">
      <table className="time-log-table">
        <thead>
          <tr>
            <th onClick={() => onSort('date')} className="sortable">Date {getSortIcon('date')}</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th onClick={() => onSort('duration')} className="sortable">Duration {getSortIcon('duration')}</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-cell">No time logs yet</td>
            </tr>
          ) : (
            logs.map((log) => {
              const duration = getDurationSeconds(log.startTime, log.endTime);
              const active = isActive(log);
              return (
                <tr key={log.startTime.getTime()} className={active ? 'active-row' : ''}>
                  <td>{formatDate(log.date)}</td>
                  <td>{formatTime(log.startTime)}</td>
                  <td>{active ? '(Active)' : formatTime(log.endTime)}</td>
                  <td>{formatDuration(duration)}</td>
                  <td>
                    <div className="actions">
                      <TagDropdown
                        tags={tags}
                        currentTagId={log.tagId}
                        onTagChange={(tagId) => onTagChange(log, tagId)}
                        onCreateNew={() => onCreateTag(log)}
                        onDeleteTag={onDeleteTag}
                        onEditTag={onEditTag}
                      />
                      <button className="btn-edit" onClick={() => onEdit(log)} title="Edit">✎ Edit</button>
                      <button className="btn-delete" onClick={() => setDeleteConfirmLog(log)} title="Delete">✕ Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {deleteConfirmLog !== null && (
        <ConfirmDialog
          message="Delete this entry?"
          onConfirm={() => {
            onDelete(deleteConfirmLog);
            setDeleteConfirmLog(null);
          }}
          onCancel={() => setDeleteConfirmLog(null)}
        />
      )}
    </div>
  );
}

export default TimeLogTable;
